import type { ParseTargetOptions, ParsedTarget } from '../types/target';
/**
 * Compatibility wrapper for remote pointer targets.
 *
 * The contextual namespace grammar lives in `parseNamespaceExpression()`;
 * this parser remains for `cleaker("me://...")` remote pointer support.
 */
export declare function parseTarget(input: string, options?: ParseTargetOptions): ParsedTarget;
//# sourceMappingURL=parseTarget.d.ts.map