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
      | 'identityHash'
      | 'space'
      | 'bootstrap'
      | 'fetcher'
    > {}

export function cleaker(target: string, options?: CleakerOptions): RemotePointerDefinition;
export function cleaker(kernel: MeKernel, space: string, options?: CleakerOptions): CleakerNode;
export function cleaker(kernel: MeKernel, options?: CleakerOptions): CleakerNode;
export function cleaker(
  input: string | MeKernel,
  spaceOrOptions?: string | CleakerOptions,
  extraOptions?: CleakerOptions,
): RemotePointerDefinition | CleakerNode {
  if (typeof input === 'string') {
    const parsed = parseTarget(input, { defaultMode: 'reactive' });
    return createRemotePointer(parsed, (spaceOrOptions as CleakerOptions) ?? {});
  }

  let space: string | undefined;
  let options: CleakerOptions;

  if (typeof spaceOrOptions === 'string') {
    space = spaceOrOptions;
    options = extraOptions ?? {};
  } else {
    options = spaceOrOptions ?? {};
  }

  return bindKernel(input, { ...options, ...(space ? { space } : {}) });
}

export default cleaker;
