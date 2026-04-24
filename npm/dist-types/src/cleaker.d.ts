import type { BindKernelOptions } from './binder';
import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type { RemotePointerDefinition } from './types/pointer';
import type { CleakerNode, MeKernel } from './types/kernel';
export interface CleakerOptions extends CreateRemotePointerOptions, Pick<BindKernelOptions, 'namespace' | 'secret' | 'identityHash' | 'origin' | 'bootstrap' | 'claimDir' | 'claimDirs' | 'claimOrigin' | 'fetcher' | 'semanticResolver' | 'semanticDefaults' | 'semanticNamespaceRoot' | 'semanticSources' | 'semanticSelector' | 'semanticNetwork' | 'semanticTransportAllowlist'> {
}
export declare function cleaker(target: string, options?: CleakerOptions): RemotePointerDefinition;
export declare function cleaker(kernel: MeKernel, options?: CleakerOptions): CleakerNode;
export default cleaker;
//# sourceMappingURL=cleaker.d.ts.map