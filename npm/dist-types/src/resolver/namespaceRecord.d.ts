import type { NamespaceRecord } from '../types/namespace';
export interface NamespaceRecordLookupInput {
    fqdn?: string | null;
    prefix?: string | null;
}
export interface NamespaceRecordSource {
    get(constant: string, lookup?: NamespaceRecordLookupInput): Promise<NamespaceRecord | null>;
}
//# sourceMappingURL=namespaceRecord.d.ts.map