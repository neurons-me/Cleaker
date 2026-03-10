import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type { RemotePointerDefinition } from './types/pointer';
import type { CleakerNode, MeKernel } from './types/kernel';
export interface CleakerOptions extends CreateRemotePointerOptions {
}
export declare function cleaker(target: string, options?: CleakerOptions): RemotePointerDefinition;
export declare function cleaker(kernel: MeKernel, options?: CleakerOptions): CleakerNode;
export default cleaker;
//# sourceMappingURL=cleaker.d.ts.map