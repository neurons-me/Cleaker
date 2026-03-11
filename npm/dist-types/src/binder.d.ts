import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type { CleakerNode, MeKernel } from './types/kernel';
export interface BindKernelOptions extends CreateRemotePointerOptions {
    namespace?: string;
    secret?: string;
    origin?: string;
    fetcher?: typeof fetch;
}
export declare function bindKernel(me: MeKernel, options?: BindKernelOptions): CleakerNode;
//# sourceMappingURL=binder.d.ts.map