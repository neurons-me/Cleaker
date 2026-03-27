export type NamespacePrefix = string | null;
export type SelectorMode = 'snapshot' | 'pull' | 'reactive';
export interface MeTargetContextAtom {
    key: string;
    value: string;
    raw: string;
}
export type MeTargetContextClause = MeTargetContextAtom[];
export type MeTargetContextSet = MeTargetContextClause[];
export interface ParsedTarget {
    scheme: 'me';
    raw: string;
    namespace: {
        prefix: NamespacePrefix;
        constant: string;
        fqdn: string;
        segments: string[];
        contextRaw: string | null;
        context: MeTargetContextSet;
    };
    intent: {
        selector: string;
        path: string;
        mode: SelectorMode;
    };
    operation: string;
    path: string;
}
export interface ParseTargetOptions {
    defaultMode?: SelectorMode;
    allowShorthandRead?: boolean;
}
//# sourceMappingURL=target.d.ts.map