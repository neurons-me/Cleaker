import type { ParsedTarget } from './target';

export type PointerStatus =
  | 'unresolved'
  | 'resolving'
  | 'connected'
  | 'stale'
  | 'timeout'
  | 'unauthorized'
  | 'error';

export interface RemotePointerIdentity {
  constant: string;
  prefix: string | null;
}

export interface RemotePointerIntent {
  selector: string;
  path: string;
  mode: ParsedTarget['intent']['mode'];
}

export interface RemotePointerResolution {
  status: PointerStatus;
  namespaceRecordVerified: boolean;
  sessionToken: string | null;
  lastError: string | null;
}

export interface RemotePointerOperationalState {
  latencyMs: number | null;
  lastSync: number | null;
  cacheTtl: number;
  stale: boolean;
}

export interface RemotePointerTransport {
  preferred: string[];
  protocol: string | null;
  resolvedEndpoint: string | null;
}

export interface RemotePointerPayload {
  kind: 'remote';
  target: ParsedTarget;
  identity: RemotePointerIdentity;
  intent: RemotePointerIntent;
  resolution: RemotePointerResolution;
  operationalState: RemotePointerOperationalState;
  transport: RemotePointerTransport;
}

export interface RemotePointerDefinition {
  __ptr: RemotePointerPayload;
  resolve(options?: ResolvePointerOptions): Promise<ResolvePointerResult>;
}

export interface ResolvePointerOptions {
  origin?: string;
  host?: string;
  headers?: Record<string, string>;
  fetcher?: typeof fetch;
}

export interface ResolvePointerResult {
  ok: boolean;
  status: number;
  endpoint: string;
  elapsedMs: number;
  data: unknown;
}
