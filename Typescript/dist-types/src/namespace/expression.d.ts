import type { ParsedNamespaceExpression } from '../types/namespace';
export declare function composeNamespace(prefix: string | null | undefined, constant: string): string;
export declare function stringifyNamespaceExpression(input: Pick<ParsedNamespaceExpression, 'fqdn' | 'contextRaw' | 'operation' | 'path'>): string;
export declare function parseNamespaceExpression(input: string): ParsedNamespaceExpression;
//# sourceMappingURL=expression.d.ts.map