import type { ResolvePointerOptions } from './pointer';
import type { RemotePointerDefinition, ResolvePointerResult } from './pointer';

export interface OpenNodeInput {
  namespace: string;
  secret: string;
  origin?: string;
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

export interface BindKernelResolverOptions {
  detectRemote?: (path: string[]) => boolean;
  mapToExpression?: (path: string[]) => string | null;
  applyResult?: (result: unknown, path: string[]) => void;
  resolveOptions?: ResolvePointerOptions;
}

export interface CleakerNode extends MeKernel {
  kernel: MeKernel;
  ready: Promise<OpenNodeResult | null>;
  open(input: OpenNodeInput): Promise<OpenNodeResult>;
  pointer(expression: string, options?: ResolvePointerOptions): RemotePointerDefinition;
  bindKernelResolver(options?: BindKernelResolverOptions): boolean;
}
