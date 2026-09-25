import type { ParsedNamespaceExpression } from '../types/namespace';
/**
 * Pure shape check: does this namespace look like a real FQDN (2+ dot-
 * separated, DNS-label-shaped segments)? This is the "derives" gate for NRP
 * resolution, not a claim/write gate — a namespace can still be claimed and
 * written to `.me` when this returns false (the kernel has always treated
 * namespace as an opaque string; `normalizeBaseToken`/`deriveConstantAndPrefix`
 * stay fully permissive on purpose). A shape-invalid namespace simply never
 * resolves through NRP — it stays an isolated, unreachable branch instead of
 * a rejected write. Single-label namespaces (no dot) are shape-invalid: NRP
 * resolution requires the real `x.y` FQDN form. Never throws.
 */
export declare function isValidDomainShape(namespace: string): boolean;
export declare function composeNamespace(prefix: string | null | undefined, constant: string): string;
export declare function stringifyNamespaceExpression(input: Pick<ParsedNamespaceExpression, 'fqdn' | 'contextRaw' | 'operation' | 'path'>): string;
export declare function parseNamespaceExpression(input: string): ParsedNamespaceExpression;
//# sourceMappingURL=expression.d.ts.map