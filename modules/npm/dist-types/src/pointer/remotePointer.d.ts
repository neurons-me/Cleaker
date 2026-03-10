import type { ParsedTarget } from '../types/target';
import type { RemotePointerDefinition } from '../types/pointer';
export interface CreateRemotePointerOptions {
    preferredTransport?: string[];
    cacheTtl?: number;
}
export declare function createRemotePointer(target: ParsedTarget, options?: CreateRemotePointerOptions): RemotePointerDefinition;
//# sourceMappingURL=remotePointer.d.ts.map