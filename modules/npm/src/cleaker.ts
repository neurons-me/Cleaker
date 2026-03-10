import { parseTarget } from './parse/parseTarget';
import { createRemotePointer } from './pointer/remotePointer';
import { bindKernel } from './binder';
import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type { RemotePointerDefinition } from './types/pointer';
import type { CleakerNode, MeKernel } from './types/kernel';

export interface CleakerOptions extends CreateRemotePointerOptions {}

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
