import type { ParseTargetOptions, ParsedTarget } from '../types/target';
export declare function stringifyMeTarget(target: Pick<ParsedTarget, 'namespace' | 'operation' | 'path'>): string;
/**
 * @deprecated Compatibility parser for the older `me://namespace:operation/path`
 * target grammar. New namespace/context work should use
 * `parseNamespaceExpression()` from `src/namespace/expression.ts`.
 */
export declare function parseMeTarget(input: string, options?: ParseTargetOptions): ParsedTarget;
//# sourceMappingURL=parseMeTarget.d.ts.map