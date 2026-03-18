import { parseTarget } from './parse/parseTarget';
import { createRemotePointer } from './pointer/remotePointer';
import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type {
  BindKernelResolverOptions,
  CleakerErrorPayload,
  CleakerEvents,
  CleakerHostRecord,
  CleakerNode,
  CleakerReadyPayload,
  CleakerState,
  CleakerStatus,
  KernelPendingResolution,
  MeKernel,
  OpenNodeInput,
  OpenNodeResult,
  ValidateHostsOptions,
} from './types/kernel';
import type { RemotePointerDefinition, ResolvePointerResult } from './types/pointer';
import type { ResolvePointerOptions } from './types/pointer';
import type {
  SemanticResolveResult,
  SemanticResolver,
  SemanticResolverDefaults,
  SemanticResolverSource,
} from './resolver/semanticResolver';

type OpenResponse = {
  ok: boolean;
  error?: string;
  namespace?: string;
  identityHash?: string;
  noise?: string;
  memories?: unknown[];
  openedAt?: number;
};

export interface BindKernelOptions extends CreateRemotePointerOptions {
  namespace?: string;
  secret?: string;
  origin?: string;
  bootstrap?: string[];
  fetcher?: typeof fetch;
  semanticResolver?: SemanticResolver;
  semanticDefaults?: SemanticResolverDefaults;
  semanticNamespaceRoot?: string;
  semanticSources?: SemanticResolverSource[];
  semanticSelector?: string;
  semanticNetwork?: boolean;
  semanticTransportAllowlist?: string[];
}

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

function normalizeReplayMemory(memory: unknown): unknown {
  if (!memory || typeof memory !== 'object') return memory;

  const record = memory as Record<string, unknown>;
  const payload = record.payload;
  const source = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : record;
  const merged: Record<string, unknown> = {
    ...source,
  };

  // Server write payloads use `expression` as the written dot-path.
  // `.me` replay expects semantic memories shaped as `{ path, operator, expression, value }`.
  if (!Object.prototype.hasOwnProperty.call(merged, 'path')) {
    const rawExpression = String(merged.expression || '').trim();
    if (rawExpression) {
      merged.path = rawExpression;
    }
  }

  if (!Object.prototype.hasOwnProperty.call(merged, 'operator')) {
    merged.operator = null;
  }

  if (Object.prototype.hasOwnProperty.call(merged, 'value')) {
    merged.expression = merged.value;
  }

  if (!Object.prototype.hasOwnProperty.call(merged, 'timestamp') && record.timestamp !== undefined) {
    merged.timestamp = record.timestamp;
  }

  if (!Object.prototype.hasOwnProperty.call(merged, 'identityHash') && record.identityHash !== undefined) {
    merged.identityHash = record.identityHash;
  }

  return merged;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function buildOrigin(protocol: string | null, host: string | null, port: number | null): string | null {
  if (!protocol || !host) return null;
  if (port === null) return `${protocol}://${host}`;
  return `${protocol}://${host}:${port}`;
}

function hashMemory(memory: unknown): string {
  const m = (memory ?? {}) as Record<string, unknown>;
  const explicit = String(m.hash || '').trim();
  if (explicit) return `h:${explicit}`;
  const ts = Number(m.timestamp || 0);
  return `v:${ts}:${stableStringify(memory)}`;
}

function normalizeOrigin(origin: string): string {
  const raw = String(origin || '').trim();
  if (!raw) return '';
  const withScheme = raw.includes('://') ? raw : `http://${raw}`;
  try {
    const url = new URL(withScheme.endsWith('/') ? withScheme : `${withScheme}/`);
    return url.origin.toLowerCase();
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

function hashFn(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

function computeHostId(origin: string): string {
  return hashFn(normalizeOrigin(origin));
}

function readKernelPath(me: MeKernel, segments: string[]): unknown {
  if (!segments.length) return undefined;
  try {
    let ref: any = me;
    for (let i = 0; i < segments.length; i += 1) {
      ref = ref?.[segments[i]];
      if (ref == null) return undefined;
    }
    if (typeof ref === 'function') {
      try {
        return ref();
      } catch {
        return undefined;
      }
    }
    return ref;
  } catch {
    return undefined;
  }
}

function writeKernelPath(me: MeKernel, segments: string[], value: unknown): boolean {
  if (!segments.length) return false;
  try {
    let ref: any = me;
    for (let i = 0; i < segments.length; i += 1) {
      ref = ref?.[segments[i]];
      if (ref == null) return false;
    }
    if (typeof ref === 'function') {
      ref(value);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function toHostRecord(input: Partial<CleakerHostRecord>, namespace: string): CleakerHostRecord | null {
  const origin = normalizeOrigin(String(input.origin || ''));
  if (!origin) return null;
  const id = String(input.id || '').trim() || computeHostId(origin);
  const baseStatus = input.status || {
    transport: 'unknown',
    triad: 'unverified',
    latencyMs: 0,
    lastSeen: 0,
  };
  const baseCapabilities = input.capabilities || {
    canClaim: false,
    canOpen: true,
    canRelay: false,
  };
  return {
    id,
    alias: input.alias ? String(input.alias) : undefined,
    origin,
    namespace,
    status: {
      transport: baseStatus.transport || 'unknown',
      triad: baseStatus.triad || 'unverified',
      latencyMs: Number(baseStatus.latencyMs || 0),
      lastSeen: Number(baseStatus.lastSeen || 0),
    },
    capabilities: {
      canClaim: !!baseCapabilities.canClaim,
      canOpen: baseCapabilities.canOpen !== false,
      canRelay: !!baseCapabilities.canRelay,
    },
    error: input.error ? String(input.error) : undefined,
  };
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
  const semanticSlots = new Map<string, RemoteSlot>();
  const listeners = new Map<keyof CleakerEvents, Set<(...args: unknown[]) => void>>();
  const defaultNamespace = String(options.namespace || '').trim();
  const defaultSecret = String(options.secret || '');
  const bootstrapOrigins = Array.isArray(options.bootstrap)
    ? options.bootstrap.map((origin) => normalizeOrigin(origin)).filter(Boolean)
    : [];

  let currentState: CleakerState = 'idle';
  let currentCycleId = 0;
  let lastStatus: CleakerStatus = {
    cycleId: 0,
    state: 'idle',
    overall: bootstrapOrigins.length ? 'degraded' : 'offline',
    activeNamespace: defaultNamespace,
    totalHosts: 0,
    verifiedHosts: 0,
    hosts: [],
  };
  let lastReadyPayload: CleakerReadyPayload | null = null;

  // Triad auto-open: if namespace + secret are provided at bind time, open immediately in the background.
  let _ready: Promise<OpenNodeResult | null> = Promise.resolve(null);
  let resolverConfig: Required<BindKernelResolverOptions> = {
    detectRemote: defaultDetectRemote,
    mapToExpression: defaultMapToExpression,
    applyResult: (result: unknown, path: string[]) => unwrapResolvedValue(result),
    resolveOptions: {},
  };
  const semanticResolver = options.semanticResolver ?? null;
  const semanticDefaults = options.semanticDefaults ?? {};
  const semanticNamespaceRoot = options.semanticNamespaceRoot ?? null;
  const semanticSources = Array.isArray(options.semanticSources) ? options.semanticSources : undefined;
  const semanticSelector = String(options.semanticSelector || 'read').trim() || 'read';
  const semanticNetwork = options.semanticNetwork !== false;
  const semanticTransportAllowlist = Array.isArray(options.semanticTransportAllowlist)
    ? options.semanticTransportAllowlist.map((item) => String(item || '').toLowerCase()).filter(Boolean)
    : ['http', 'https'];

  function resolveBoundKernelTarget(path: string): unknown {
    const normalized = String(path || '').trim().replace(/^\/+/, '').replace(/\//g, '.');
    if (!normalized) return undefined;
    return tryReadLocal(me, normalized.split('.').filter(Boolean));
  }

  function isSemanticCandidate(raw: string): boolean {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return false;
    if (trimmed.includes('://')) return false;
    if (trimmed.includes(':')) return false;
    return trimmed.includes('/');
  }

  function buildSemanticKey(raw: string): string {
    return `semantic:${raw}`;
  }

  function semanticRawToPathSegments(raw: string): string[] {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return [];
    const sanitized = trimmed.replace(/^me:\/\//, '').replace(/^\/+/, '');
    const parts = sanitized.split('/').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return [];
    const [head, ...rest] = parts;
    if (head.includes('.')) {
      const namespaceParts = head.split('.').map((segment) => segment.trim()).filter(Boolean);
      return [...namespaceParts, ...rest];
    }
    return parts;
  }

  function pathToSemanticRaw(path: string[]): string | null {
    const parts = path.map((segment) => String(segment || '').trim()).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts[0].includes('.')) {
      if (parts.length < 2) return null;
      return [parts[0], ...parts.slice(1)].join('/');
    }
    if (parts.length >= 2 && parts[1].toLowerCase() === 'me') {
      const namespace = `${parts[0]}.me`;
      const rest = parts.slice(2);
      if (rest.length === 0) return null;
      return [namespace, ...rest].join('/');
    }
    return null;
  }

  function semanticResultToExpression(result: SemanticResolveResult): string | null {
    const namespace = result.namespace ?? result.semantic.namespace;
    if (!namespace) return null;
    const path = result.semantic.path || 'profile';
    return `${namespace}:${semanticSelector}/${path}`;
  }

  function semanticResultToPath(result: SemanticResolveResult): string[] {
    const rawPath = result.semantic.path || 'profile';
    return rawPath.split('/').map((segment) => segment.trim()).filter(Boolean);
  }

  function buildSemanticResolveOptions(
    result: SemanticResolveResult,
    base: ResolvePointerOptions,
  ): ResolvePointerOptions {
    const options: ResolvePointerOptions = {
      ...base,
    };
    const protocol = result.transport.protocol?.toLowerCase() ?? null;
    if (protocol && semanticTransportAllowlist.includes(protocol)) {
      const origin = buildOrigin(
        result.transport.protocol,
        result.transport.host,
        result.transport.port,
      );
      if (origin) options.origin = options.origin || origin;
    }
    const namespace = result.namespace ?? result.semantic.namespace;
    if (namespace && !options.host) options.host = namespace;
    return options;
  }

  async function resolveSemantic(raw: string): Promise<SemanticResolveResult | null> {
    if (!semanticResolver) return null;
    try {
      return await semanticResolver.resolve({
        raw,
        defaults: semanticDefaults,
        namespaceRoot: semanticNamespaceRoot ?? undefined,
        sources: semanticSources,
      });
    } catch {
      return null;
    }
  }

  function emit<E extends keyof CleakerEvents>(eventName: E, ...args: Parameters<CleakerEvents[E]>) {
    const handlers = listeners.get(eventName);
    if (!handlers || handlers.size === 0) return;
    handlers.forEach((handler) => {
      try {
        (handler as (...input: unknown[]) => void)(...args);
      } catch {
        // Never let observers break runtime lifecycle.
      }
    });
  }

  function on<E extends keyof CleakerEvents>(eventName: E, handler: CleakerEvents[E]): () => void {
    const set = listeners.get(eventName) || new Set<(...args: unknown[]) => void>();
    set.add(handler as (...args: unknown[]) => void);
    listeners.set(eventName, set);
    return () => off(eventName, handler);
  }

  function off<E extends keyof CleakerEvents>(eventName: E, handler: CleakerEvents[E]): void {
    const set = listeners.get(eventName);
    if (!set) return;
    set.delete(handler as (...args: unknown[]) => void);
    if (set.size === 0) listeners.delete(eventName);
  }

  function once<E extends keyof CleakerEvents>(eventName: E, handler: CleakerEvents[E]): () => void {
    const unsubscribe = on(eventName, ((...args: Parameters<CleakerEvents[E]>) => {
      unsubscribe();
      (handler as (...input: unknown[]) => void)(...(args as unknown[]));
    }) as CleakerEvents[E]);
    return unsubscribe;
  }

  function transition(nextState: CleakerState, cycleId: number): void {
    currentState = nextState;
    lastStatus = {
      ...lastStatus,
      cycleId,
      state: nextState,
    };
    emit('status:change', getStatus());
  }

  function persistHostRecord(namespace: string, host: CleakerHostRecord): void {
    const base = ['namespaces', namespace, 'registry', 'hosts', host.id];
    writeKernelPath(me, [...base, 'id'], host.id);
    writeKernelPath(me, [...base, 'alias'], host.alias || '');
    writeKernelPath(me, [...base, 'origin'], host.origin);
    writeKernelPath(me, [...base, 'namespace'], host.namespace);
    writeKernelPath(me, [...base, 'status', 'transport'], host.status.transport);
    writeKernelPath(me, [...base, 'status', 'triad'], host.status.triad);
    writeKernelPath(me, [...base, 'status', 'latencyMs'], host.status.latencyMs);
    writeKernelPath(me, [...base, 'status', 'lastSeen'], host.status.lastSeen);
    writeKernelPath(me, [...base, 'capabilities', 'canClaim'], host.capabilities.canClaim);
    writeKernelPath(me, [...base, 'capabilities', 'canOpen'], host.capabilities.canOpen);
    writeKernelPath(me, [...base, 'capabilities', 'canRelay'], host.capabilities.canRelay);
    writeKernelPath(me, [...base, 'error'], host.error || '');
  }

  function discoverHosts(input: { namespace?: string; bootstrap?: string[] } = {}): CleakerHostRecord[] {
    const namespace = String(input.namespace || defaultNamespace || '').trim();
    if (!namespace) return [];

    const hostMap = new Map<string, CleakerHostRecord>();
    const rawRegistry = readKernelPath(me, ['namespaces', namespace, 'registry', 'hosts']);
    if (rawRegistry && typeof rawRegistry === 'object' && !Array.isArray(rawRegistry)) {
      const registry = rawRegistry as Record<string, unknown>;
      Object.keys(registry).forEach((key) => {
        const candidate = registry[key] as Partial<CleakerHostRecord>;
        const parsed = toHostRecord({
          ...candidate,
          id: candidate?.id || key,
        }, namespace);
        if (parsed) hostMap.set(parsed.id, parsed);
      });
    }

    if (hostMap.size === 0) {
      const runtimeBootstrap = Array.isArray(input.bootstrap)
        ? input.bootstrap.map((origin) => normalizeOrigin(origin)).filter(Boolean)
        : [];
      const fallbackOrigins = [normalizeOrigin(options.origin || ''), ...bootstrapOrigins, ...runtimeBootstrap].filter(Boolean);
      fallbackOrigins.forEach((origin) => {
        const host = toHostRecord({ origin }, namespace);
        if (!host) return;
        hostMap.set(host.id, host);
        persistHostRecord(namespace, host);
      });
    }

    return Array.from(hostMap.values());
  }

  async function ping(origin: string, timeoutMs: number, fetcher: typeof fetch): Promise<boolean> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetcher(`${normalizeOrigin(origin)}/__bootstrap`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller?.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async function openRemote(
    origin: string,
    namespace: string,
    secret: string,
    timeoutMs: number,
    fetcher: typeof fetch,
  ): Promise<OpenResponse | { ok: false; error: string }> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetcher(`${normalizeOrigin(origin)}/claims/open`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ namespace, secret }),
        signal: controller?.signal,
      });
      let data: OpenResponse | { ok: false; error: string } = { ok: false, error: 'UNKNOWN_ERROR' };
      try {
        data = (await response.json()) as OpenResponse | { ok: false; error: string };
      } catch {
        data = { ok: false, error: `OPEN_FAILED_${response.status}` };
      }
      if (!response.ok || !data.ok) {
        return {
          ok: false,
          error: String((data as { error?: string }).error || `OPEN_FAILED_${response.status}`),
        };
      }
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.name : String(error);
      return {
        ok: false,
        error: message === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  function getStatus(): CleakerStatus {
    return {
      ...lastStatus,
      hosts: lastStatus.hosts.map((host) => ({
        ...host,
        status: { ...host.status },
        capabilities: { ...host.capabilities },
      })),
    };
  }

  async function waitUntilReady(timeoutMs = 10000): Promise<CleakerReadyPayload> {
    if (currentState === 'ready' && lastReadyPayload) return lastReadyPayload;
    return await new Promise<CleakerReadyPayload>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsub();
        reject(new Error('TIMEOUT_WAITING_FOR_READY'));
      }, timeoutMs);
      const unsub = once('ready', (payload) => {
        clearTimeout(timeoutId);
        resolve(payload);
      });
    });
  }

  async function validateHosts(input: ValidateHostsOptions = {}): Promise<CleakerStatus> {
    const namespace = String(input.namespace || defaultNamespace || '').trim();
    const secret = String(input.secret !== undefined ? input.secret : defaultSecret);
    const strategy = input.triadStrategy || 'first-success';
    const timeoutMs = Number(input.timeoutMs || 5000);
    const fetcher = options.fetcher || fetch;
    const cycleId = ++currentCycleId;

    if (!namespace) {
      const error: CleakerErrorPayload = {
        code: 'NAMESPACE_REQUIRED',
        message: 'Cannot validate hosts without namespace.',
      };
      emit('error', error);
      transition('offline', cycleId);
      lastStatus = {
        ...lastStatus,
        cycleId,
        state: 'offline',
        overall: 'offline',
        activeNamespace: namespace,
        totalHosts: 0,
        verifiedHosts: 0,
        hosts: [],
      };
      emit('status:change', getStatus());
      return getStatus();
    }

    transition('discovering', cycleId);
    const hosts = discoverHosts({
      namespace,
      bootstrap: input.bootstrap,
    });
    if (!hosts.length) {
      transition('offline', cycleId);
      lastStatus = {
        ...lastStatus,
        cycleId,
        state: 'offline',
        overall: 'offline',
        activeNamespace: namespace,
        totalHosts: 0,
        verifiedHosts: 0,
        hosts: [],
      };
      emit('status:change', getStatus());
      return getStatus();
    }

    transition('probing', cycleId);
    let verifiedHost: CleakerHostRecord | null = null;
    let hydratedFromHostId = '';
    let hydratedIdentityHash = '';
    let hydratedMemoriesCount = 0;

    for (let i = 0; i < hosts.length; i += 1) {
      const host = hosts[i];
      const start = Date.now();
      const reachable = await ping(host.origin, timeoutMs, fetcher);
      host.status.transport = reachable ? 'up' : 'down';
      host.status.latencyMs = Date.now() - start;
      host.status.lastSeen = Date.now();

      if (!reachable) {
        host.status.triad = 'unverified';
        host.error = 'NETWORK_ERROR';
        persistHostRecord(namespace, host);
        continue;
      }

      if (!secret) {
        host.status.triad = 'unverified';
        host.error = 'SECRET_REQUIRED';
        persistHostRecord(namespace, host);
        continue;
      }

      transition('opening', cycleId);
      const opened = await openRemote(host.origin, namespace, secret, timeoutMs, fetcher);
      if (!opened.ok) {
        const errorCode = String(opened.error || 'OPEN_FAILED');
        host.status.triad = errorCode === 'CLAIM_NOT_FOUND' ? 'unverified' : 'failed';
        host.error = errorCode;
        emit('error', {
          code: errorCode,
          message: `Triad open failed on ${host.origin}`,
          hostId: host.id,
        });
        persistHostRecord(namespace, host);
        continue;
      }

      host.status.triad = 'verified';
      host.error = undefined;
      persistHostRecord(namespace, host);
      emit('host:triad:success', host.id);

      if (!verifiedHost) verifiedHost = host;

      transition('hydrating', cycleId);
      const allMemories = Array.isArray(opened.memories) ? opened.memories : [];
      const learnedCountBefore = hydratedMemoryHashes.size;
      allMemories.forEach((memory) => {
        hydrateMemory(memory);
      });
      hydratedMemoriesCount += Math.max(0, hydratedMemoryHashes.size - learnedCountBefore);

      if (opened.noise !== undefined) {
        me.noise = String(opened.noise || '');
      }

      hydratedFromHostId = host.id;
      hydratedIdentityHash = String(opened.identityHash || '');

      if (strategy === 'first-success') {
        for (let j = i + 1; j < hosts.length; j += 1) {
          hosts[j].status.triad = 'skipped';
        }
        break;
      }
    }

    if (cycleId !== currentCycleId) {
      return getStatus();
    }

    const verifiedHosts = hosts.filter((host) => host.status.triad === 'verified').length;
    const overall = verifiedHosts > 0 ? 'healthy' : 'degraded';
    const state: CleakerState = verifiedHosts > 0 ? 'ready' : 'degraded';

    transition(state, cycleId);
    lastStatus = {
      cycleId,
      state,
      overall,
      activeNamespace: namespace,
      totalHosts: hosts.length,
      verifiedHosts,
      hosts,
    };
    emit('status:change', getStatus());

    if (verifiedHost) {
      const payload: CleakerReadyPayload = {
        namespace,
        cycleId,
        sourceHostId: hydratedFromHostId || verifiedHost.id,
        sourceOrigin: verifiedHost.origin,
        identityHash: hydratedIdentityHash,
        timestamp: Date.now(),
        hydratedMemories: hydratedMemoriesCount,
        summary: {
          verifiedHosts,
          totalHosts: hosts.length,
          overall,
        },
      };
      lastReadyPayload = payload;
      emit('ready', payload);
    }

    return getStatus();
  }

  function pointer(expression: string, resolveOptions: ResolvePointerOptions = {}) {
    const target = parseTarget(expression, { defaultMode: 'reactive' });
    const remotePointer = createRemotePointer(target, {
      ...options,
      resolveLocalTarget: (localTarget) => {
        if (localTarget.namespace.prefix !== null) {
          throw new Error('LOCAL_TARGET_PREFIX_NOT_ALLOWED');
        }

        if (localTarget.namespace.constant !== 'local' && localTarget.namespace.constant !== 'self') {
          throw new Error('LOCAL_TARGET_REQUIRED');
        }

        return resolveBoundKernelTarget(localTarget.intent.path);
      },
    });

    if (!Object.keys(resolveOptions).length) return remotePointer;

    return {
      ...remotePointer,
      resolve(input: ResolvePointerOptions = {}) {
        return remotePointer.resolve({
          ...resolveOptions,
          ...input,
        });
      },
    };
  }

  function hydrateMemory(memory: unknown): boolean {
    const normalizedMemory = normalizeReplayMemory(memory);
    const key = hashMemory(normalizedMemory);
    if (hydratedMemoryHashes.has(key)) return false;

    hydratedMemoryHashes.add(key);
    hydratedMemories.push(normalizedMemory);

    if (typeof me.learn === 'function') {
      me.learn(normalizedMemory);
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

  // Triad: auto-open if namespace + secret were provided at bind time
  if (options.namespace && options.secret) {
    _ready = open({
      namespace: options.namespace,
      secret: options.secret,
      origin: options.origin,
      fetcher: options.fetcher,
    }).catch(() => null);
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

  function getOrCreateSemanticSlot(raw: string, pathOverride?: string[]): RemoteSlot | undefined {
    if (!semanticResolver || !isSemanticCandidate(raw)) return undefined;

    const key = buildSemanticKey(raw);
    const existing = semanticSlots.get(key);
    if (existing) return existing;

    const placeholderPointer = pointer('semantic:read/_');
    const overlaySegments = pathOverride && pathOverride.length
      ? pathOverride.map((segment) => String(segment || '').trim()).filter(Boolean)
      : semanticRawToPathSegments(raw);
    const overlayKey = overlaySegments.join('.');
    const placeholderPath = overlaySegments.length ? overlaySegments : ['profile'];
    const slot: RemoteSlot = {
      key,
      path: placeholderPath.length ? placeholderPath : ['profile'],
      expression: raw,
      pointer: placeholderPointer,
      promise: Promise.resolve({
        ok: false,
        status: 0,
        endpoint: '',
        elapsedMs: 0,
        data: null,
      } as ResolvePointerResult),
    };

    slot.promise = (async () => {
      const resolvedSemantic = await resolveSemantic(raw);
      if (!resolvedSemantic) {
        return {
          ok: false,
          status: 0,
          endpoint: raw,
          elapsedMs: 0,
          data: { ok: false, error: 'SEMANTIC_UNRESOLVED' },
        };
      }

      if (!resolvedSemantic.transport.uri) {
        return {
          ok: false,
          status: 0,
          endpoint: raw,
          elapsedMs: 0,
          data: {
            ok: false,
            error: 'SEMANTIC_BINDING_MISSING',
            unresolved: resolvedSemantic.unresolved,
            transport: resolvedSemantic.transport,
            semantic: resolvedSemantic.semantic,
          },
        };
      }

      const semanticProtocol = resolvedSemantic.transport.protocol?.toLowerCase() ?? null;
      const canNetwork = semanticNetwork &&
        !!semanticProtocol &&
        semanticTransportAllowlist.includes(semanticProtocol);
      if (!canNetwork) {
        const deferred = {
          ok: false,
          status: 0,
          endpoint: resolvedSemantic.transport.uri || raw,
          elapsedMs: 0,
          data: {
            ok: false,
            error: 'SEMANTIC_TRANSPORT_DEFERRED',
            transport: resolvedSemantic.transport,
            semantic: resolvedSemantic.semantic,
          },
        } as ResolvePointerResult;
        slot.lastResult = deferred;
        return deferred;
      }

      const expression = semanticResultToExpression(resolvedSemantic);
      if (!expression) {
        return {
          ok: false,
          status: 0,
          endpoint: raw,
          elapsedMs: 0,
          data: { ok: false, error: 'SEMANTIC_TARGET_MISSING' },
        };
      }

      const resolvedPointer = pointer(expression);
      const resolvedPath = semanticResultToPath(resolvedSemantic);
      slot.expression = expression;
      slot.pointer = resolvedPointer;
      slot.path = resolvedPath;

      const resolved = await resolvedPointer.resolve(
        buildSemanticResolveOptions(resolvedSemantic, resolverConfig.resolveOptions),
      );
      slot.lastResult = resolved;

      if (resolved.ok) {
        const applied = resolverConfig.applyResult(resolved.data, resolvedPath);
        const learnedValue = applied === undefined ? unwrapResolvedValue(resolved.data) : applied;
        remoteOverlay.set(key, learnedValue);
        if (overlayKey) remoteOverlay.set(overlayKey, learnedValue);

        const learnedMemory = createLearnedMemory(resolvedPath, learnedValue);
        if (learnedMemory) hydrateMemory(learnedMemory);
      }

      return resolved;
    })();

    semanticSlots.set(key, slot);
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
            if (semanticResolver && isSemanticCandidate(raw)) {
              const semanticKey = buildSemanticKey(raw);
              if (remoteOverlay.has(semanticKey)) return remoteOverlay.get(semanticKey);
              const overlayKey = semanticRawToPathSegments(raw).join('.');
              if (overlayKey && remoteOverlay.has(overlayKey)) return remoteOverlay.get(overlayKey);
              const semanticSlot = getOrCreateSemanticSlot(raw);
              return semanticSlot ? createPendingToken(semanticSlot) : undefined;
            }
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
          if (key === 'ready') return _ready;
          if (key === 'pointer') return pointer;
          if (key === 'bindKernelResolver') return bindKernelResolver;
          if (key === 'discoverHosts') return discoverHosts;
          if (key === 'validateHosts') return validateHosts;
          if (key === 'getStatus') return getStatus;
          if (key === 'waitUntilReady') return waitUntilReady;
          if (key === 'on') return on;
          if (key === 'once') return once;
          if (key === 'off') return off;
          if (key === 'state') return currentState;
          if (key === 'currentCycleId') return currentCycleId;

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

        const semanticRaw = semanticResolver ? pathToSemanticRaw(path) : null;
        if (semanticRaw) {
          const semanticSlot = semanticSlots.get(buildSemanticKey(semanticRaw));
          if (semanticSlot) {
            if (key === 'status') {
              return semanticSlot.lastResult
                ? semanticSlot.pointer.__ptr.resolution.status
                : 'pending';
            }
            if (key === 'pointer') return semanticSlot.pointer;
            if (key === 'promise') return semanticSlot.promise;
            if (key === 'result') return semanticSlot.lastResult;
            if (key === 'then') return semanticSlot.promise.then.bind(semanticSlot.promise);
          }
        } else {
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
        }

        const nextPath = [...path, key];
        const nextKey = nextPath.join('.');
        if (remoteOverlay.has(nextKey)) return remoteOverlay.get(nextKey);

        const local = tryReadLocal(me, nextPath);
        if (local !== undefined) return local;

        const semanticRawNext = semanticResolver ? pathToSemanticRaw(nextPath) : null;
        if (semanticRawNext) {
          getOrCreateSemanticSlot(semanticRawNext, nextPath);
          return createFacade(nextPath);
        }

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
