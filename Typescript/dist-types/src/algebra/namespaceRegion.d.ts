export type NamespaceBind = 'none' | 'self';
export interface NamespaceRegion {
    domain: string;
    subdomain: string | null;
    port: number | null;
    path: string[];
    bind: NamespaceBind;
}
export interface ParseNamespaceRegionOptions {
    defaultBind?: NamespaceBind;
}
export declare function createNamespaceRegion(input: NamespaceRegion): NamespaceRegion;
export declare function parseNamespaceRegion(input: string, options?: ParseNamespaceRegionOptions): NamespaceRegion;
export declare function namespaceRegionToString(region: NamespaceRegion): string;
//# sourceMappingURL=namespaceRegion.d.ts.map