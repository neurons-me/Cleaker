import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type { CleakerNode, MeKernel } from './types/kernel';
export interface BindKernelOptions extends CreateRemotePointerOptions {
}
export declare function bindKernel(me: MeKernel, options?: BindKernelOptions): CleakerNode;
//# sourceMappingURL=binder.d.ts.map