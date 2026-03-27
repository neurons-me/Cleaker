import type { CreateRemotePointerOptions } from './pointer/remotePointer';
import type { CleakerNode, MeKernel } from './types/kernel';
import type { SemanticResolver, SemanticResolverDefaults, SemanticResolverSource } from './resolver/semanticResolver';
export interface BindKernelOptions extends CreateRemotePointerOptions {
    namespace?: string;
    secret?: string;
    origin?: string;
    bootstrap?: string[];
    claimDir?: string;
    claimDirs?: string[];
    claimOrigin?: string;
    fetcher?: typeof fetch;
    semanticResolver?: SemanticResolver;
    semanticDefaults?: SemanticResolverDefaults;
    semanticNamespaceRoot?: string;
    semanticSources?: SemanticResolverSource[];
    semanticSelector?: string;
    semanticNetwork?: boolean;
    semanticTransportAllowlist?: string[];
}
export declare function bindKernel(me: MeKernel, options?: BindKernelOptions): CleakerNode;
//# sourceMappingURL=binder.d.ts.map