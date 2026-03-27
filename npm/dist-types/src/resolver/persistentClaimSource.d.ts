import type { NamespaceRecord, NamespaceSelectorPolicy } from '../types/namespace';
import type { NamespaceRecordLookupInput, NamespaceRecordSource } from './namespaceRecord';
export interface PersistentClaimPublicKey {
    kid: string;
    alg: string;
    key: string;
    source?: string;
}
export interface PersistentClaimSignature {
    alg: string;
    value: string;
    encoding: 'base64';
}
export interface PersistentClaimRecord {
    kind: 'PersistentClaimV1';
    version: 1;
    namespace: string;
    identityHash: string;
    publicKey: PersistentClaimPublicKey;
    proofKey: PersistentClaimPublicKey;
    issuedAt: number;
    signature: PersistentClaimSignature;
}
export interface LoadedPersistentClaim {
    claimPath: string;
    claim: PersistentClaimRecord;
}
export interface PersistentClaimDiscoveryOptions {
    claimDir?: string;
    claimDirs?: string[];
    origin?: string;
    origins?: string[];
    hostId?: string;
    selectors?: Record<string, NamespaceSelectorPolicy>;
    verifySignatures?: boolean;
}
export declare function resolvePersistentClaimDirs(options?: Pick<PersistentClaimDiscoveryOptions, 'claimDir' | 'claimDirs'>): string[];
export declare function loadPersistentClaimRecord(namespace: string, options?: Pick<PersistentClaimDiscoveryOptions, 'claimDir' | 'claimDirs' | 'verifySignatures'>): LoadedPersistentClaim | null;
export declare function listPersistentClaims(options?: Pick<PersistentClaimDiscoveryOptions, 'claimDir' | 'claimDirs' | 'verifySignatures'>): LoadedPersistentClaim[];
export declare function buildNamespaceRecordFromPersistentClaim(loaded: LoadedPersistentClaim, options?: Omit<PersistentClaimDiscoveryOptions, 'claimDir' | 'claimDirs'>): NamespaceRecord;
export declare class PersistentClaimNamespaceRecordSource implements NamespaceRecordSource {
    private readonly options;
    constructor(options?: PersistentClaimDiscoveryOptions);
    get(constant: string, lookup?: NamespaceRecordLookupInput): Promise<NamespaceRecord | null>;
}
//# sourceMappingURL=persistentClaimSource.d.ts.map