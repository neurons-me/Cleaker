import type { ParsedTarget } from '../types/target';
import type { NamespaceRecord } from '../types/namespace';
import type { NamespaceRecordSource } from './namespaceRecord';
export interface ResolveResult {
    target: ParsedTarget;
    namespaceRecord: NamespaceRecord;
    endpoint: string | null;
    protocol: string | null;
}
export declare class CleakerResolver {
    private readonly source;
    constructor(source: NamespaceRecordSource);
    resolve(target: ParsedTarget): Promise<ResolveResult>;
}
//# sourceMappingURL=resolver.d.ts.map