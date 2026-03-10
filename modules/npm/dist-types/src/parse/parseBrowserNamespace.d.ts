import type { ParsedBrowserNamespace } from '../types/browser';
export interface ParseBrowserNamespaceOptions {
    localPrefixes?: string[];
}
export declare function parseBrowserNamespace(input: string, options?: ParseBrowserNamespaceOptions): ParsedBrowserNamespace;
export declare function browserNamespaceToString(parsed: ParsedBrowserNamespace): string;
//# sourceMappingURL=parseBrowserNamespace.d.ts.map