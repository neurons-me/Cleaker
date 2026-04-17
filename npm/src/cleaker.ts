import { parseTarget } from './parse/parseTarget';
import { createRemotePointer } from './pointer/remotePointer';
import {
  DEFAULT_CLEAKER_DEVELOPMENT_ORIGIN,
  DEFAULT_CLEAKER_NAMESPACE_ORIGIN,
} from './constants';
import { bindKernel } from './binder';
import type { BindKernelOptions } from './binder';
import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type { RemotePointerDefinition } from './types/pointer';
import type { CleakerNode, MeKernel } from './types/kernel';
export interface CleakerOptions
  extends CreateRemotePointerOptions,
    Pick<
      BindKernelOptions,
      | 'namespace'
      | 'secret'
      | 'origin'
      | 'bootstrap'
      | 'claimDir'
      | 'claimDirs'
      | 'claimOrigin'
      | 'fetcher'
      | 'semanticResolver'
      | 'semanticDefaults'
      | 'semanticNamespaceRoot'
      | 'semanticSources'
      | 'semanticSelector'
      | 'semanticNetwork'
      | 'semanticTransportAllowlist'
    > {}

export function cleaker(target: string, options?: CleakerOptions): RemotePointerDefinition;
export function cleaker(kernel: MeKernel, options?: CleakerOptions): CleakerNode;
export function cleaker(
  input: string | MeKernel,
  options: CleakerOptions = {},
): RemotePointerDefinition | CleakerNode {
  if (typeof input === 'string') {
    const parsed = parseTarget(input, { defaultMode: 'reactive' });
    return createRemotePointer(parsed, options);
  }

  return bindKernel(input, options);
}

export default cleaker;
