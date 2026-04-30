import type { ResolvePointerOptions } from './pointer';
import type { RemotePointerDefinition, ResolvePointerResult } from './pointer';

export interface OpenNodeInput {
  namespace: string;
  secret: string;
  identityHash?: string;
  space?: string;
  headers?: Record<string, string>;
  fetcher?: typeof fetch;
}

export interface OpenNodeResult {
  status: 'verified';
  namespace: string;
  identityHash: string;
  noise: string;
  openedAt: number;
  memoriesCount: number;
}

export interface MeKernel {
  learn?: (memory: unknown) => void;
  replayMemories?: (memories: unknown[]) => void;
  noise?: string;
  [key: string]: unknown;
}

export interface KernelPendingResolution {
  status: 'pending';
  path?: string;
  pointer: RemotePointerDefinition;
  promise: Promise<ResolvePointerResult>;
}

export interface CleakerNode extends MeKernel {
  kernel: MeKernel;
  ready: Promise<OpenNodeResult | null>;
  claim(input: OpenNodeInput): Promise<OpenNodeResult>;
  signIn(input: OpenNodeInput): Promise<OpenNodeResult>;
  pointer(expression: string, options?: ResolvePointerOptions): RemotePointerDefinition;
  state: CleakerState;
  currentCycleId: number;
  discoverHosts(): CleakerHostRecord[];
  validateHosts(options?: ValidateHostsOptions): Promise<CleakerStatus>;
  getStatus(): CleakerStatus;
  waitUntilReady(timeoutMs?: number): Promise<CleakerReadyPayload>;
  on<E extends keyof CleakerEvents>(eventName: E, handler: CleakerEvents[E]): () => void;
  once<E extends keyof CleakerEvents>(eventName: E, handler: CleakerEvents[E]): () => void;
  off<E extends keyof CleakerEvents>(eventName: E, handler: CleakerEvents[E]): void;
}

export type CleakerState =
  | 'idle'
  | 'discovering'
  | 'probing'
  | 'opening'
  | 'hydrating'
  | 'ready'
  | 'degraded'
  | 'offline';

export type CleakerTransportState = 'up' | 'down' | 'unknown';
export type CleakerTriadState = 'verified' | 'unverified' | 'failed' | 'skipped';
export type CleakerOverallState = 'healthy' | 'degraded' | 'offline';

export interface CleakerHostRecord {
  id: string;
  alias?: string;
  space: string;
  namespace: string;
  status: {
    transport: CleakerTransportState;
    triad: CleakerTriadState;
    latencyMs: number;
    lastSeen: number;
  };
  capabilities: {
    canClaim: boolean;
    canOpen: boolean;
    canRelay: boolean;
  };
  error?: string;
}

export interface CleakerStatus {
  cycleId: number;
  state: CleakerState;
  overall: CleakerOverallState;
  activeNamespace: string;
  totalHosts: number;
  verifiedHosts: number;
  hosts: CleakerHostRecord[];
}

export interface CleakerReadyPayload {
  namespace: string;
  cycleId: number;
  sourceHostId: string;
  sourceOrigin: string;
  identityHash: string;
  timestamp: number;
  hydratedMemories: number;
  summary: {
    verifiedHosts: number;
    totalHosts: number;
    overall: 'healthy' | 'degraded';
  };
}

export interface CleakerErrorPayload {
  code: string;
  message: string;
  hostId?: string;
}

export interface ValidateHostsOptions {
  triadStrategy?: 'first-success' | 'all';
  timeoutMs?: number;
  namespace?: string;
  secret?: string;
  identityHash?: string;
  bootstrap?: string[];
}

export interface CleakerEvents {
  'status:change': (status: CleakerStatus) => void;
  ready: (payload: CleakerReadyPayload) => void;
  error: (error: CleakerErrorPayload) => void;
  'host:triad:success': (hostId: string) => void;
}
