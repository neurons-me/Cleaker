import { parseTarget } from './parse/parseTarget';
import { createRemotePointer } from './pointer/remotePointer';
import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type {
  BindKernelResolverOptions,
  CleakerNode,
  KernelPendingResolution,
  MeKernel,
  OpenNodeInput,
  OpenNodeResult,
} from './types/kernel';
import type { RemotePointerDefinition, ResolvePointerResult } from './types/pointer';

type OpenResponse = {
  ok: boolean;
  error?: string;
  namespace?: string;
  identityHash?: string;
  noise?: string;
  memories?: unknown[];
  openedAt?: number;
};

export interface BindKernelOptions extends CreateRemotePointerOptions {}

type RemoteSlot = {
  key: string;
  path: string[];
  expression: string;
  pointer: RemotePointerDefinition;
  promise: Promise<ResolvePointerResult>;
  lastResult?: ResolvePointerResult;
};

type LearnedMemory = {
  path: string;
  operator: string | null;
  expression: unknown;
  value: unknown;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function hashMemory(memory: unknown): string {
  const m = (memory ?? {}) as Record<string, unknown>;
  const explicit = String(m.hash || '').trim();
  if (explicit) return `h:${explicit}`;
  const ts = Number(m.timestamp || 0);
  return `v:${ts}:${stableStringify(memory)}`;
}

function defaultDetectRemote(path: string[]): boolean {
  const joined = path.join('.').trim();
  if (joined.includes('.cleaker:') || joined.includes(':')) return true;

  return path.some((segment, index) => {
    const normalized = segment.toLowerCase();
    return (
      normalized.includes('cleaker:') ||
      normalized.includes(':') ||
      (normalized === 'cleaker' && index < path.length - 1)
    );
  });
}

function defaultMapToExpression(inputPath: string[]): string | null {
  const path = inputPath.map((x) => String(x || '').trim()).filter(Boolean);
  if (path.length === 0) return null;

  const joined = path.join('.');
  if (joined.includes(':')) return joined;

  const cleakerIx = path.findIndex((segment) => segment.toLowerCase() === 'cleaker');
  if (cleakerIx > 0 && cleakerIx < path.length - 1) {
    const prefix = path[cleakerIx - 1];
    const rest = path.slice(cleakerIx + 1).join('.');
    return `${prefix}.cleaker:read/${rest || 'profile'}`;
  }

  return null;
}

function unwrapResolvedValue(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const record = data as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, 'value')) return record.value;
  return data;
}

function tryReadLocal(me: MeKernel, path: string[]): unknown {
  if (path.length === 0 || typeof me !== 'function') return undefined;
  try {
    return (me as any)(path.join('.'));
  } catch {
    return undefined;
  }
}

function tryInvokeKernelPath(me: MeKernel, path: string[], args: unknown[]): unknown {
  if (typeof me !== 'function') return undefined;

  try {
    if (path.length === 0) {
      return (me as any)(...args);
    }

    let ref: any = me;
    for (const part of path) {
      ref = ref?.[part];
    }
    if (typeof ref === 'function') {
      return ref(...args);
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function bindKernel(me: MeKernel, options: BindKernelOptions = {}): CleakerNode {
  const hydratedMemoryHashes = new Set<string>();
  const hydratedMemories: unknown[] = [];
  const remoteOverlay = new Map<string, unknown>();
  const remoteSlots = new Map<string, RemoteSlot>();
  let resolverConfig: Required<BindKernelResolverOptions> = {
    detectRemote: defaultDetectRemote,
    mapToExpression: defaultMapToExpression,
    applyResult: (result: unknown, path: string[]) => unwrapResolvedValue(result),
    resolveOptions: {},
  };

  function pointer(expression: string) {
    const target = parseTarget(expression, { defaultMode: 'reactive' });
    return createRemotePointer(target, options);
  }

  function hydrateMemory(memory: unknown): boolean {
    const key = hashMemory(memory);
    if (hydratedMemoryHashes.has(key)) return false;

    hydratedMemoryHashes.add(key);
    hydratedMemories.push(memory);

    if (typeof me.learn === 'function') {
      me.learn(memory);
      return true;
    }

    if (typeof me.replayMemories === 'function') {
      me.replayMemories(hydratedMemories.slice());
      return true;
    }

    return true;
  }

  function createLearnedMemory(path: string[], value: unknown): LearnedMemory | null {
    const normalizedPath = path.map((part) => String(part || '').trim()).filter(Boolean);
    if (normalizedPath.length === 0) return null;

    return {
      path: normalizedPath.join('.'),
      operator: null,
      expression: value,
      value,
    };
  }

  async function open(input: OpenNodeInput): Promise<OpenNodeResult> {
    const namespace = String(input.namespace || '').trim();
    const secret = String(input.secret || '');
    const origin = String(input.origin || 'http://localhost:8161').replace(/\/+$/, '');

    if (!namespace) throw new Error('NAMESPACE_REQUIRED');
    if (!secret) throw new Error('SECRET_REQUIRED');

    const fetcher = input.fetcher || fetch;
    const response = await fetcher(`${origin}/claims/open`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(input.headers || {}),
      },
      body: JSON.stringify({ namespace, secret }),
    });

    const data = (await response.json()) as OpenResponse;
    if (!response.ok || !data?.ok) {
      throw new Error(String(data?.error || `OPEN_FAILED_${response.status}`));
    }

    const allMemories = Array.isArray(data.memories) ? data.memories : [];
    const memories = allMemories.filter((memory) => hydrateMemory(memory));

    me.noise = String(data.noise || '');

    return {
      status: 'verified',
      namespace: String(data.namespace || namespace),
      identityHash: String(data.identityHash || ''),
      noise: String(data.noise || ''),
      openedAt: Number(data.openedAt || Date.now()),
      memoriesCount: memories.length,
    };
  }

  function bindKernelResolver(bindOptions: BindKernelResolverOptions = {}): boolean {
    resolverConfig = {
      detectRemote: bindOptions.detectRemote || resolverConfig.detectRemote,
      mapToExpression: bindOptions.mapToExpression || resolverConfig.mapToExpression,
      applyResult: bindOptions.applyResult || resolverConfig.applyResult,
      resolveOptions: bindOptions.resolveOptions || resolverConfig.resolveOptions,
    };
    return true;
  }

  function getOrCreateRemoteSlot(path: string[]): RemoteSlot | undefined {
    if (!resolverConfig.detectRemote(path)) return undefined;

    const key = path.join('.');
    const existing = remoteSlots.get(key);
    if (existing) return existing;

    const expression = resolverConfig.mapToExpression(path);
    if (!expression) return undefined;

    const remotePointer = pointer(expression);
    const slot: RemoteSlot = {
      key,
      path: path.slice(),
      expression,
      pointer: remotePointer,
      promise: Promise.resolve({
        ok: false,
        status: 0,
        endpoint: '',
        elapsedMs: 0,
        data: null,
      } as ResolvePointerResult),
    };

    slot.promise = remotePointer.resolve(resolverConfig.resolveOptions).then((resolved) => {
      slot.lastResult = resolved;
      if (resolved.ok) {
        const applied = resolverConfig.applyResult(resolved.data, path);
        const learnedValue = applied === undefined ? unwrapResolvedValue(resolved.data) : applied;
        remoteOverlay.set(key, learnedValue);

        const learnedMemory = createLearnedMemory(path, learnedValue);
        if (learnedMemory) hydrateMemory(learnedMemory);
      }
      return resolved;
    });

    remoteSlots.set(key, slot);
    return slot;
  }

  function createPendingToken(slot: RemoteSlot): KernelPendingResolution {
    return {
      status: 'pending',
      path: slot.key,
      pointer: slot.pointer,
      promise: slot.promise,
    };
  }

  function exposeKernelProperty(prop: string): unknown {
    if (!(prop in (me as any))) return undefined;
    const value = (me as any)[prop];
    return typeof value === 'function' ? value.bind(me) : value;
  }

  function createFacade(path: string[] = []): any {
    const fn = (...args: unknown[]) => {
      if (path.length === 0) {
        if (typeof me === 'function') {
          if (args.length === 1 && typeof args[0] === 'string') {
            const raw = String(args[0] || '').trim();
            const local = tryReadLocal(me, raw.split('.').filter(Boolean));
            if (local !== undefined) return local;
            if (raw.includes(':')) {
              const slot = getOrCreateRemoteSlot(raw.split('.').filter(Boolean));
              return slot ? createPendingToken(slot) : undefined;
            }
          }
          return (me as any)(...args);
        }
        return undefined;
      }

      const invoked = tryInvokeKernelPath(me, path, args);
      if (invoked !== undefined) return invoked;
      return createFacade(path);
    };

    return new Proxy(fn, {
      get(_target, prop) {
        if (typeof prop === 'symbol') return (fn as any)[prop];

        const key = String(prop);

        if (path.length === 0) {
          if (key === 'kernel') return me;
          if (key === 'open') return open;
          if (key === 'pointer') return pointer;
          if (key === 'bindKernelResolver') return bindKernelResolver;

          const kernelProperty = exposeKernelProperty(key);
          if (kernelProperty !== undefined) return kernelProperty;
        }

        const currentKey = path.join('.');
        const cachedCurrent = remoteOverlay.get(currentKey);
        if (
          cachedCurrent &&
          typeof cachedCurrent === 'object' &&
          !Array.isArray(cachedCurrent) &&
          Object.prototype.hasOwnProperty.call(cachedCurrent, key)
        ) {
          return (cachedCurrent as Record<string, unknown>)[key];
        }

        const currentSlot = getOrCreateRemoteSlot(path);
        if (currentSlot) {
          if (key === 'status') {
            return currentSlot.lastResult
              ? currentSlot.pointer.__ptr.resolution.status
              : 'pending';
          }
          if (key === 'pointer') return currentSlot.pointer;
          if (key === 'promise') return currentSlot.promise;
          if (key === 'result') return currentSlot.lastResult;
          if (key === 'then') return currentSlot.promise.then.bind(currentSlot.promise);
        }

        const nextPath = [...path, key];
        const nextKey = nextPath.join('.');
        if (remoteOverlay.has(nextKey)) return remoteOverlay.get(nextKey);

        const local = tryReadLocal(me, nextPath);
        if (local !== undefined) return local;

        getOrCreateRemoteSlot(nextPath);
        return createFacade(nextPath);
      },
      apply(_target, _thisArg, args) {
        return fn(...args);
      },
    });
  }

  bindKernelResolver();
  return createFacade([]) as CleakerNode;
}
