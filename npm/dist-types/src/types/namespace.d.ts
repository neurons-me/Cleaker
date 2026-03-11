export interface NamespacePublicKey {
    kid: string;
    alg: string;
    key: string;
}
export interface NamespaceSelectorPolicy {
    visibility?: 'public' | 'private' | 'scoped';
    protocols?: string[];
    auth?: string[];
}
export interface NamespaceHostRecord {
    id: string;
    endpoints: string[];
    transport?: string[];
    attrs?: Record<string, unknown>;
}
export interface NamespaceRecord {
    constant: string;
    version: number;
    publicKeys: NamespacePublicKey[];
    selectors: Record<string, NamespaceSelectorPolicy>;
    hosts: NamespaceHostRecord[];
    signature?: string;
}
//# sourceMappingURL=namespace.d.ts.map