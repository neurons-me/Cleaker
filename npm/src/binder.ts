import { parseTarget } from './parse/parseTarget';
import { createRemotePointer } from './pointer/remotePointer';
import {
  DEFAULT_CLEAKER_DEVELOPMENT_ORIGIN,
  DEFAULT_CLEAKER_LAN_PORT,
  DEFAULT_CLEAKER_NAMESPACE_ORIGIN,
} from './constants';
import { composeNamespace, parseNamespaceExpression } from './namespace/expression';
import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type {
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

const ME_EXPRESSION_SYMBOL = Symbol.for('me.expression');
const ME_IDENTITY_SYMBOL = Symbol.for('me.identity');

type SignInResponse = {
  ok: boolean;
  error?: string;
  namespace?: string;
  identityHash?: string;
  noise?: string;
  memories?: unknown[];
  openedAt?: number;
  target?: {
    namespace?: string | { me?: string; host?: string };
  };
};

type ClaimProof = {
  identityHash: string;
  expression: string;
  namespace: string;
  rootNamespace: string;
  publicKey: string;
  message: string;
  signature: string;
  timestamp: number;
};

type ClaimResponse = {
  ok: boolean;
  error?: string;
  namespace?: string | { me?: string; host?: string };
  identityHash?: string;
  publicKey?: string;
  createdAt?: number;
  persistentClaim?: unknown;
  target?: {
    namespace?: string | { me?: string; host?: string };
  };
};

export interface BindKernelOptions extends CreateRemotePointerOptions {
  namespace?: string;
  secret?: string;
  identityHash?: string;
  origin?: string;
  space?: string;
  bootstrap?: string[];
  fetcher?: typeof fetch;
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

function stripPort(raw: string): string {
  return String(raw || '').trim().toLowerCase().replace(/:\d+$/i, '');
}

function normalizeSurfaceOrigin(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const candidate = raw.includes('://')
    ? raw
    : `${isLoopbackishHost(raw) ? 'http' : 'https'}://${raw}`;

  try {
    const parsed = new URL(candidate.endsWith('/') ? candidate : `${candidate}/`);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = String(parsed.hostname || '').trim().toLowerCase();
    if (!protocol || !hostname) return '';
    return `${protocol}//${hostname}`;
  } catch {
    const host = stripPort(raw.replace(/^https?:\/\//i, '').split('/')[0] || '');
    if (!host) return '';
    return `${isLoopbackishHost(host) ? 'http' : 'https'}://${host}`;
  }
}

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isBareHostname(host: string): boolean {
  return !host.includes('.') && !isIpAddress(host);
}

function parseSpaceHostPort(raw: string): { host: string; port: number | null } {
  const colonIdx = raw.lastIndexOf(':');
  if (colonIdx > 0) {
    const portStr = raw.slice(colonIdx + 1);
    const portNum = parseInt(portStr, 10);
    if (String(portNum) === portStr && portNum > 0) {
      return { host: raw.slice(0, colonIdx), port: portNum };
    }
  }
  return { host: raw, port: null };
}

// Resolves a user-supplied space string to a normalized origin URL per spec:
// - IP address (with optional port) → http://{ip}:{port|8161}
// - Bare hostname (no dot)          → http://{host}.local:{port|8161}
// - Domain (has dot)                → https://{domain}:{port?}
// - Already has ://                 → normalize as-is
function normalizeSpaceOrigin(space: string): string {
  const raw = String(space || '').trim();
  if (!raw) return '';

  if (raw.includes('://')) {
    return normalizeOrigin(raw);
  }

  const { host, port } = parseSpaceHostPort(raw);
  const lowerHost = host.toLowerCase();

  if (isIpAddress(lowerHost)) {
    return `http://${lowerHost}:${port ?? DEFAULT_CLEAKER_LAN_PORT}`;
  }

  if (isBareHostname(lowerHost)) {
    return `http://${lowerHost}.local:${port ?? DEFAULT_CLEAKER_LAN_PORT}`;
  }

  // Public domain (has dot)
  const portSuffix = port ? `:${port}` : '';
  return `https://${lowerHost}${portSuffix}`;
}

// Returns the namespace constant (no port) for a user-supplied space string.
function deriveSpaceNamespaceConstant(space: string): string {
  const raw = String(space || '').trim();
  if (!raw) return '';

  if (raw.includes('://')) {
    try {
      return new URL(raw).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  const { host } = parseSpaceHostPort(raw);
  const lowerHost = host.toLowerCase();

  if (isIpAddress(lowerHost)) return lowerHost;
  if (isBareHostname(lowerHost)) return `${lowerHost}.local`;
  return lowerHost;
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

function normalizeExpression(value: unknown): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function normalizeIdentityHash(value: unknown): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function normalizeNamespaceValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized) return normalized;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const me = typeof record.me === 'string' ? record.me.trim() : '';
    if (me) return me;
    const host = typeof record.host === 'string' ? record.host.trim() : '';
    if (host) return host;
  }

  return fallback;
}

function resolveEnvelopeNamespace(data: unknown, fallback = ''): string {
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;
  const direct = normalizeNamespaceValue(record.namespace, '');
  if (direct) return direct;
  const target = record.target;
  if (target && typeof target === 'object') {
    return normalizeNamespaceValue((target as Record<string, unknown>).namespace, fallback);
  }
  return fallback;
}

function readKernelExpression(me: MeKernel): string | null {
  try {
    const viaSymbol = normalizeExpression((me as any)[ME_EXPRESSION_SYMBOL]);
    if (viaSymbol) return viaSymbol;
  } catch {
    // Ignore and fall through to the reflective plane.
  }

  try {
    const runtime = (me as any)['!'];
    const currentExpression = runtime?.currentExpression;
    if (typeof currentExpression === 'function') {
      const value = normalizeExpression(currentExpression());
      if (value) return value;
    }
    if (
      currentExpression &&
      typeof currentExpression === 'object' &&
      typeof (currentExpression as { call?: () => unknown }).call === 'function'
    ) {
      const value = normalizeExpression((currentExpression as { call: () => unknown }).call());
      if (value) return value;
    }
  } catch {
    // Kernels may omit the escape plane entirely.
  }

  return null;
}

function readKernelIdentityHash(me: MeKernel): string | null {
  try {
    const viaSymbol = (me as any)[ME_IDENTITY_SYMBOL];
    if (viaSymbol && typeof viaSymbol === 'object') {
      const value = normalizeIdentityHash((viaSymbol as { hash?: unknown }).hash);
      if (value) return value;
    }
    const direct = normalizeIdentityHash(viaSymbol);
    if (direct) return direct;
  } catch {
    // Ignore and fall through to the reflective plane.
  }

  try {
    const runtime = (me as any)['!'];
    const identity = runtime?.identity;
    if (typeof identity === 'function') {
      const value = identity();
      if (value && typeof value === 'object') {
        const hash = normalizeIdentityHash((value as { hash?: unknown }).hash);
        if (hash) return hash;
      }
      const direct = normalizeIdentityHash(value);
      if (direct) return direct;
    }
    if (
      identity &&
      typeof identity === 'object' &&
      typeof (identity as { call?: () => unknown }).call === 'function'
    ) {
      const value = (identity as { call: () => unknown }).call();
      if (value && typeof value === 'object') {
        const hash = normalizeIdentityHash((value as { hash?: unknown }).hash);
        if (hash) return hash;
      }
      const direct = normalizeIdentityHash(value);
      if (direct) return direct;
    }
  } catch {
    // Kernels may omit the escape plane entirely.
  }

  return null;
}

function readKernelRuntimeMethod<T extends (...args: any[]) => unknown>(
  me: MeKernel,
  methodName: string,
): T | null {
  try {
    const runtime = (me as any)['!'];
    const method = runtime?.[methodName];
    if (typeof method === 'function') return method as T;
    if (method && typeof method === 'object' && typeof method.call === 'function') {
      return ((...args: unknown[]) => method.call(...args)) as T;
    }
  } catch {
    // Ignore and fall back.
  }

  try {
    const direct = (me as any)[methodName];
    if (typeof direct === 'function') return direct.bind(me) as T;
  } catch {
    // Ignore and report unsupported below.
  }

  return null;
}

function resolveProofRootNamespace(namespace: string): string {
  const raw = String(namespace || '').trim();
  if (!raw) return '';
  try {
    return parseNamespaceExpression(raw).constant;
  } catch {
    const parts = raw.split('.').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) return parts.slice(1).join('.');
    return raw;
  }
}

async function proveKernelNamespace(me: MeKernel, namespace: string): Promise<ClaimProof> {
  const prove = readKernelRuntimeMethod<(input: { rootNamespace: string; challenge?: string | null }) => Promise<unknown>>(
    me,
    'prove',
  );
  if (!prove) {
    throw new Error('PROVE_UNSUPPORTED');
  }

  const rootNamespace = resolveProofRootNamespace(namespace);
  if (!rootNamespace) {
    throw new Error('ROOT_NAMESPACE_REQUIRED');
  }

  const proof = await prove({ rootNamespace, challenge: null });
  if (!proof || typeof proof !== 'object') {
    throw new Error('PROOF_INVALID');
  }

  const claimedNamespace = String((proof as Record<string, unknown>).namespace || '').trim();
  if (!claimedNamespace) {
    throw new Error('PROOF_INVALID');
  }
  if (claimedNamespace !== namespace) {
    throw new Error('PROOF_NAMESPACE_MISMATCH');
  }

  return proof as ClaimProof;
}

function isLoopbackishHost(raw: string): boolean {
  const host = stripPort(raw);
  return /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)$/.test(host);
}

function readLocationHost(): string {
  if (typeof globalThis === 'undefined') return '';

  const locationLike = (globalThis as { location?: unknown }).location;
  if (!locationLike) return '';

  if (typeof locationLike === 'string') {
    try {
      const parsedHost = new URL(locationLike.includes('://') ? locationLike : `https://${locationLike}`).hostname.toLowerCase();
      return isLoopbackishHost(parsedHost) ? '' : parsedHost;
    } catch {
      const fallbackHost = stripPort(String(locationLike).trim().toLowerCase());
      return isLoopbackishHost(fallbackHost) ? '' : fallbackHost;
    }
  }

  const record = locationLike as Record<string, unknown>;
  const host = stripPort(String(record.hostname || record.host || '').trim().toLowerCase());
  if (isLoopbackishHost(host)) return '';
  if (host) return host;

  const origin = String(record.origin || record.href || '').trim();
  if (!origin) return '';

  try {
    const parsedHost = new URL(origin.includes('://') ? origin : `https://${origin}`).hostname.toLowerCase();
    return isLoopbackishHost(parsedHost) ? '' : parsedHost;
  } catch {
    return '';
  }
}

function readLocationSurfaceOrigin(): string {
  if (typeof globalThis === 'undefined') return '';

  const locationLike = (globalThis as { location?: unknown }).location;
  if (!locationLike) return '';

  if (typeof locationLike === 'string') {
    return normalizeSurfaceOrigin(locationLike);
  }

  const record = locationLike as Record<string, unknown>;
  const origin = normalizeSurfaceOrigin(String(record.origin || ''));
  if (origin) return origin;

  const href = String(record.href || '').trim();
  if (href) return normalizeSurfaceOrigin(href);

  const host = String(record.hostname || record.host || '').trim().toLowerCase();
  if (!host) return '';
  return normalizeSurfaceOrigin(host);
}

function readConfiguredSurfaceOrigin(input: string): string {
  const constant = deriveNamespaceConstant(input);
  if (!constant) return '';
  return normalizeSurfaceOrigin(constant);
}

type BuiltinOsLike = {
  hostname?: () => string;
};

function readRuntimeHostSurfaceOrigin(): string {
  if (typeof process === 'undefined') return '';

  const envCandidate = String(
    process.env.CLEAKER_SURFACE_HOST
      || process.env.MONAD_SELF_IDENTITY
      || process.env.CLEAKER_NAMESPACE_ROOT
      || process.env.CLEAKER_NAMESPACE_HOST
      || process.env.HOSTNAME
      || process.env.COMPUTERNAME
      || '',
  ).trim();
  const envSurface = readConfiguredSurfaceOrigin(envCandidate);
  if (envSurface) return envSurface;

  const runtime = process as typeof process & {
    getBuiltinModule?: (name: string) => unknown;
  };
  if (typeof runtime.getBuiltinModule !== 'function') return '';

  try {
    const os = runtime.getBuiltinModule('node:os') as BuiltinOsLike | undefined;
    const hostname = String(os?.hostname?.() || '').trim();
    if (!hostname) return '';
    return normalizeSurfaceOrigin(hostname);
  } catch {
    return '';
  }
}

function deriveNamespaceConstant(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    try {
      return parseNamespaceExpression(new URL(raw).hostname).constant;
    } catch {
      return '';
    }
  }

  try {
    return parseNamespaceExpression(raw).constant;
  } catch {
    try {
      const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
      return parseNamespaceExpression(url.hostname).constant;
    } catch {
      return '';
    }
  }
}

function uniqueOrigins(origins: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const origin of origins) {
    const normalized = normalizeOrigin(String(origin || ''));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
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
  const listeners = new Map<keyof CleakerEvents, Set<(...args: unknown[]) => void>>();
  const explicitNamespace = String(options.namespace || '').trim();
  const defaultSecret = String(options.secret || '');
  const explicitIdentityHash = normalizeIdentityHash(options.identityHash);
  const bootstrapOrigins = Array.isArray(options.bootstrap)
    ? options.bootstrap.map((origin) => normalizeOrigin(origin)).filter(Boolean)
    : [];
  const pointerResolveOptions: ResolvePointerOptions = {
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    headers: {
      accept: 'application/json',
    },
  };

  let currentState: CleakerState = 'idle';
  let currentCycleId = 0;
  let lastStatus: CleakerStatus = {
    cycleId: 0,
    state: 'idle',
    overall: bootstrapOrigins.length ? 'degraded' : 'offline',
    activeNamespace: resolveNamespace(),
    totalHosts: 0,
    verifiedHosts: 0,
    hosts: [],
  };
  let lastReadyPayload: CleakerReadyPayload | null = null;

  // Triad auto-open: if namespace + secret are provided at bind time, open immediately in the background.
  let _ready: Promise<OpenNodeResult | null> = Promise.resolve(null);

  function resolveSurfaceNamespaceConstant(): string {
    if (options.space) {
      const spaceConstant = deriveSpaceNamespaceConstant(options.space);
      if (spaceConstant) return spaceConstant;
    }

    const locationHost = readLocationHost();
    if (locationHost) return deriveNamespaceConstant(locationHost);

    const envNamespaceRoot = typeof process !== 'undefined'
      ? String(process.env.CLEAKER_NAMESPACE_ROOT || process.env.CLEAKER_NAMESPACE_HOST || '')
      : '';
    if (envNamespaceRoot) return deriveNamespaceConstant(envNamespaceRoot);

    return deriveNamespaceConstant(DEFAULT_CLEAKER_NAMESPACE_ORIGIN);
  }

  function resolveNamespace(inputNamespace?: string): string {
    const explicit = String(inputNamespace || explicitNamespace || '').trim();
    if (explicit) return explicit;

    const expression = readKernelExpression(me);
    if (!expression) return '';

    const constant = resolveSurfaceNamespaceConstant();
    if (!constant) return '';

    return composeNamespace(expression, constant);
  }

  function resolveSurfaceOrigins(runtimeBootstrap: string[] = [], preferredOrigin = ''): string[] {
    const spaceOrigin = options.space ? normalizeSpaceOrigin(options.space) : '';
    const locationSurfaceOrigin = readLocationSurfaceOrigin();
    const envNamespaceSurface = typeof process !== 'undefined'
      ? String(process.env.CLEAKER_NAMESPACE_ROOT || process.env.CLEAKER_NAMESPACE_HOST || '')
      : '';
    const configuredSurfaceOrigin = readConfiguredSurfaceOrigin(envNamespaceSurface || '');
    const runtimeHostSurfaceOrigin = readRuntimeHostSurfaceOrigin();

    return uniqueOrigins([
      preferredOrigin,
      spaceOrigin,
      options.origin,
      ...bootstrapOrigins,
      ...runtimeBootstrap,
      locationSurfaceOrigin,
      configuredSurfaceOrigin,
      runtimeHostSurfaceOrigin,
      DEFAULT_CLEAKER_DEVELOPMENT_ORIGIN,
      DEFAULT_CLEAKER_NAMESPACE_ORIGIN,
    ]);
  }

  function resolveIdentityHash(inputIdentityHash?: string): string {
    return normalizeIdentityHash(inputIdentityHash)
      || explicitIdentityHash
      || readKernelIdentityHash(me)
      || '';
  }

  function resolveBoundKernelTarget(path: string): unknown {
    const normalized = String(path || '').trim().replace(/^\/+/, '').replace(/\//g, '.');
    if (!normalized) return undefined;
    return tryReadLocal(me, normalized.split('.').filter(Boolean));
  }

  function isRemoteTargetExpression(raw: string): boolean {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return false;
    return trimmed.startsWith('me://') || trimmed.startsWith('nrp://') || trimmed.includes(':');
  }

  function parseRemoteTargetPath(raw: string): string[] | null {
    if (!isRemoteTargetExpression(raw)) return null;
    try {
      const parsed = parseTarget(raw, {
        defaultMode: 'reactive',
        allowShorthandRead: true,
      });
      return String(parsed.path || '')
        .trim()
        .replace(/^\/+/, '')
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);
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
    const namespace = resolveNamespace(input.namespace);
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
      const fallbackOrigins = resolveSurfaceOrigins(runtimeBootstrap);
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

  async function postJson(
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs: number,
    fetcher: typeof fetch,
    headers: Record<string, string> = {},
  ): Promise<{
    ok: boolean;
    status: number;
    data: Record<string, unknown> | null;
    error?: string;
  }> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      });

      let data: Record<string, unknown> | null = null;
      try {
        data = (await response.json()) as Record<string, unknown>;
      } catch {
        data = null;
      }

      if (!response.ok || !data?.ok) {
        return {
          ok: false,
          status: response.status,
          data,
          error: String(data?.error || `REQUEST_FAILED_${response.status}`),
        };
      }

      return {
        ok: true,
        status: response.status,
        data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.name : String(error);
      return {
        ok: false,
        status: 0,
        data: null,
        error: message === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  function normalizeSignInResponse(
    data: Record<string, unknown>,
    namespace: string,
    identityHash: string,
  ): SignInResponse {
    return {
      ok: true,
      namespace: resolveEnvelopeNamespace(data, namespace),
      identityHash: normalizeIdentityHash(data.identityHash) || identityHash,
      noise: String(data.noise || ''),
      memories: Array.isArray(data.memories) ? data.memories : [],
      openedAt: Number(data.openedAt || Date.now()),
      target: data.target && typeof data.target === 'object'
        ? (data.target as { namespace?: string | { me?: string; host?: string } })
        : undefined,
    };
  }

  function normalizeClaimResponse(
    data: Record<string, unknown>,
    namespace: string,
    identityHash: string,
  ): ClaimResponse {
    return {
      ok: true,
      namespace: resolveEnvelopeNamespace(data, namespace),
      identityHash: normalizeIdentityHash(data.identityHash) || identityHash,
      publicKey: typeof data.publicKey === 'string' ? data.publicKey : undefined,
      createdAt: Number(data.createdAt || Date.now()),
      persistentClaim: data.persistentClaim,
      target: data.target && typeof data.target === 'object'
        ? (data.target as { namespace?: string | { me?: string; host?: string } })
        : undefined,
    };
  }

  async function signInRemote(
    origin: string,
    namespace: string,
    secret: string,
    identityHash: string,
    timeoutMs: number,
    fetcher: typeof fetch,
    headers: Record<string, string> = {},
  ): Promise<SignInResponse | { ok: false; error: string }> {
    const body = { namespace, secret, ...(identityHash ? { identityHash } : {}) };

    // Primary: POST /claims/signIn
    const primary = await postJson(`${normalizeOrigin(origin)}/claims/signIn`, body, timeoutMs, fetcher, headers);
    if (primary.ok && primary.data) return normalizeSignInResponse(primary.data, namespace, identityHash);

    const primaryError = String(primary.error || 'OPEN_FAILED');
    if (primaryError === 'CLAIM_NOT_FOUND') return { ok: false, error: primaryError };

    // Fallback: legacy POST / with operation:"open" (pre-Fase3 nodes)
    if (primary.status === 404) {
      const legacy = await postJson(
        `${normalizeOrigin(origin)}/`,
        { operation: 'open', ...body },
        timeoutMs,
        fetcher,
        { 'x-forwarded-host': namespace, ...headers },
      );
      if (legacy.ok && legacy.data) return normalizeSignInResponse(legacy.data, namespace, identityHash);
      return { ok: false, error: String(legacy.error || primaryError) };
    }

    return { ok: false, error: primaryError };
  }

  async function claimRemote(
    origin: string,
    namespace: string,
    secret: string,
    timeoutMs: number,
    fetcher: typeof fetch,
    headers: Record<string, string> = {},
  ): Promise<ClaimResponse | { ok: false; error: string }> {
    let proof: ClaimProof;
    try {
      proof = await proveKernelNamespace(me, namespace);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'PROOF_INVALID',
      };
    }

    // Primary: POST /me/kernel:claim/<namespace>
    const claimed = await postJson(
      `${normalizeOrigin(origin)}/me/kernel:claim/${encodeURIComponent(namespace)}`,
      { namespace, secret, proof },
      timeoutMs,
      fetcher,
      headers,
    );

    if (claimed.ok && claimed.data) {
      return normalizeClaimResponse(claimed.data, namespace, proof.identityHash);
    }

    // Fallback: legacy POST / with operation:"claim" (older nodes without /me/kernel:claim/*)
    if (claimed.status === 404 || claimed.status === 405) {
      const legacy = await postJson(
        `${normalizeOrigin(origin)}/`,
        { operation: 'claim', namespace, secret, proof },
        timeoutMs,
        fetcher,
        { 'x-forwarded-host': namespace, ...headers },
      );

      if (legacy.ok && legacy.data) {
        return normalizeClaimResponse(legacy.data, namespace, proof.identityHash);
      }

      return { ok: false, error: String(legacy.error || claimed.error || 'CLAIM_FAILED') };
    }

    return { ok: false, error: String(claimed.error || 'CLAIM_FAILED') };
  }

  async function bindRemoteLifecycle(
    origin: string,
    namespace: string,
    secret: string,
    identityHash: string,
    timeoutMs: number,
    fetcher: typeof fetch,
    headers: Record<string, string> = {},
  ): Promise<SignInResponse | { ok: false; error: string }> {
    const opened = await signInRemote(origin, namespace, secret, identityHash, timeoutMs, fetcher, headers);
    if (opened.ok || opened.error !== 'CLAIM_NOT_FOUND') {
      return opened;
    }

    const claimed = await claimRemote(origin, namespace, secret, timeoutMs, fetcher, headers);
    if (!claimed.ok) {
      return {
        ok: false,
        error: String(claimed.error || 'CLAIM_FAILED'),
      };
    }

    const reopenedIdentityHash = normalizeIdentityHash(claimed.identityHash) || identityHash;
    return signInRemote(
      origin,
      resolveEnvelopeNamespace(claimed, namespace),
      secret,
      reopenedIdentityHash,
      timeoutMs,
      fetcher,
      headers,
    );
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
    const namespace = resolveNamespace(input.namespace);
    const secret = String(input.secret !== undefined ? input.secret : defaultSecret);
    const identityHash = resolveIdentityHash(input.identityHash);
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
      const opened = await bindRemoteLifecycle(host.origin, namespace, secret, identityHash, timeoutMs, fetcher);
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

  async function signIn(input: OpenNodeInput): Promise<OpenNodeResult> {
    const namespace = resolveNamespace(input.namespace);
    const secret = String(input.secret || '');
    const identityHash = resolveIdentityHash(input.identityHash);

    if (!namespace) throw new Error('NAMESPACE_REQUIRED');
    if (!secret) throw new Error('SECRET_REQUIRED');

    const fetcher = input.fetcher || fetch;
    const origins = resolveSurfaceOrigins([], input.origin);
    let lastError = 'SIGNIN_FAILED';

    for (const origin of origins) {
      const opened = await bindRemoteLifecycle(
        origin,
        namespace,
        secret,
        identityHash,
        5000,
        fetcher,
        input.headers || {},
      );

      if (!opened.ok) {
        lastError = String(opened.error || 'SIGNIN_FAILED');
        continue;
      }

      const allMemories = Array.isArray(opened.memories) ? opened.memories : [];
      const memories = allMemories.filter((memory) => hydrateMemory(memory));

      me.noise = String(opened.noise || '');

      return {
        status: 'verified',
        namespace: String(opened.namespace || namespace),
        identityHash: String(opened.identityHash || identityHash || ''),
        noise: String(opened.noise || ''),
        openedAt: Number(opened.openedAt || Date.now()),
        memoriesCount: memories.length,
      };
    }

    throw new Error(lastError);
  }

  async function claim(input: OpenNodeInput): Promise<OpenNodeResult> {
    const namespace = resolveNamespace(input.namespace);
    const secret = String(input.secret || '');

    if (!namespace) throw new Error('NAMESPACE_REQUIRED');
    if (!secret) throw new Error('SECRET_REQUIRED');

    const fetcher = input.fetcher || fetch;
    const origins = resolveSurfaceOrigins([], input.origin);
    let lastError = 'CLAIM_FAILED';

    for (const origin of origins) {
      const result = await claimRemote(origin, namespace, secret, 5000, fetcher, input.headers || {});

      if (!result.ok) {
        lastError = String(result.error || 'CLAIM_FAILED');
        continue;
      }

      return {
        status: 'verified',
        namespace: String(resolveEnvelopeNamespace(result, namespace)),
        identityHash: String(result.identityHash || ''),
        noise: '',
        openedAt: Number(result.createdAt || Date.now()),
        memoriesCount: 0,
      };
    }

    throw new Error(lastError);
  }

  if (resolveNamespace()) {
    discoverHosts({ namespace: explicitNamespace });
  }

  // Triad: auto-signIn if secret is provided and namespace can be resolved from context.
  if (options.secret) {
    _ready = signIn({
      namespace: explicitNamespace,
      secret: options.secret,
      identityHash: options.identityHash,
      origin: options.origin,
      fetcher: options.fetcher,
    }).catch(() => null);
  }

  function getOrCreateRemoteSlot(path: string[]): RemoteSlot | undefined {
    if (!defaultDetectRemote(path)) return undefined;

    const key = path.join('.');
    const existing = remoteSlots.get(key);
    if (existing) return existing;

    const expression = defaultMapToExpression(path);
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

    slot.promise = remotePointer.resolve(pointerResolveOptions).then((resolved) => {
      slot.lastResult = resolved;
      if (resolved.ok) {
        const learnedValue = unwrapResolvedValue(resolved.data);
        remoteOverlay.set(key, learnedValue);

        const learnedMemory = createLearnedMemory(path, learnedValue);
        if (learnedMemory) hydrateMemory(learnedMemory);
      }
      return resolved;
    });

    remoteSlots.set(key, slot);
    return slot;
  }

  function getOrCreateDirectRemoteSlot(raw: string): RemoteSlot | undefined {
    const path = parseRemoteTargetPath(raw);
    if (!path || path.length === 0) return undefined;
    const key = `target:${raw}`;
    const existing = remoteSlots.get(key);
    if (existing) return existing;

    const remotePointer = pointer(raw);
    const slot: RemoteSlot = {
      key,
      path: path.slice(),
      expression: raw,
      pointer: remotePointer,
      promise: Promise.resolve({
        ok: false,
        status: 0,
        endpoint: '',
        elapsedMs: 0,
        data: null,
      } as ResolvePointerResult),
    };

    slot.promise = remotePointer.resolve(pointerResolveOptions).then((resolved) => {
      slot.lastResult = resolved;
      if (resolved.ok) {
        const learnedValue = unwrapResolvedValue(resolved.data);
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
            const remoteTargetPath = parseRemoteTargetPath(raw);
            if (remoteTargetPath) {
              const localRemote = tryReadLocal(me, remoteTargetPath);
              if (localRemote !== undefined) return localRemote;
              const directSlot = getOrCreateDirectRemoteSlot(raw);
              return directSlot ? createPendingToken(directSlot) : undefined;
            }

            const local = tryReadLocal(me, raw.split('.').filter(Boolean));
            if (local !== undefined) return local;
            if (isRemoteTargetExpression(raw)) {
              const slot = getOrCreateDirectRemoteSlot(raw);
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
          if (key === 'claim') return claim;
          if (key === 'signIn') return signIn;
          if (key === 'ready') return _ready;
          if (key === 'pointer') return pointer;
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

  return createFacade([]) as CleakerNode;
}
