export type NamespacePrefix = string | null;
export type SelectorMode = 'snapshot' | 'pull' | 'reactive';
export interface ParsedTarget {
    scheme: 'nrp';
    raw: string;
    namespace: {
        prefix: NamespacePrefix;
        constant: string;
        fqdn: string;
    };
    intent: {
        selector: string;
        path: string;
        mode: SelectorMode;
    };
}
export interface ParseTargetOptions {
    defaultMode?: SelectorMode;
}
//# sourceMappingURL=target.d.ts.map