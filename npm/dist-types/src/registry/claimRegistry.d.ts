import type { UserProfileV1 } from '../protocol/handshake';
import type { LoadedPersistentClaim, PersistentClaimDiscoveryOptions } from '../resolver/persistentClaimSource';
import type { NamespaceRecord } from '../types/namespace';
export interface RegistryMetadataRecord {
    kind: 'CleakerRegistryMetadataV1';
    version: 1;
    namespace: string;
    profile?: UserProfileV1;
    tags?: string[];
    topics?: string[];
    summary?: string;
}
export interface LoadedRegistryMetadata {
    metadataPath: string;
    metadata: RegistryMetadataRecord;
}
export interface ClaimRegistryEntry {
    namespace: string;
    identityHash: string;
    issuedAt: number;
    claimPath: string;
    namespaceRecord: NamespaceRecord;
    profile: UserProfileV1 | null;
    tags: string[];
    topics: string[];
    summary: string | null;
    metadataPath: string | null;
    rawClaim: LoadedPersistentClaim['claim'];
}
export interface ClaimRegistrySearchHit {
    entry: ClaimRegistryEntry;
    score: number;
    reasons: string[];
}
export interface ClaimRegistryIndexOptions extends PersistentClaimDiscoveryOptions {
    metadataDir?: string;
    metadataDirs?: string[];
}
export declare function resolveRegistryMetadataDirs(options?: Pick<ClaimRegistryIndexOptions, 'metadataDir' | 'metadataDirs' | 'claimDir' | 'claimDirs'>): string[];
export declare function loadRegistryMetadata(namespace: string, options?: Pick<ClaimRegistryIndexOptions, 'metadataDir' | 'metadataDirs' | 'claimDir' | 'claimDirs'>): LoadedRegistryMetadata | null;
export declare class PersistentClaimRegistry {
    private readonly options;
    private entries;
    constructor(options?: ClaimRegistryIndexOptions);
    refresh(): ClaimRegistryEntry[];
    list(): ClaimRegistryEntry[];
    get(namespace: string): ClaimRegistryEntry | null;
    search(query: string, limit?: number): ClaimRegistrySearchHit[];
    related(namespace: string, limit?: number): ClaimRegistrySearchHit[];
}
//# sourceMappingURL=claimRegistry.d.ts.map