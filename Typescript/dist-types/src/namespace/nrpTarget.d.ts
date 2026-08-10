import type { ParsedNamespaceExpression } from '../types/namespace.js';
/**
 * The canonical entry point for parsing an NRP target string
 * (`me://namespace[context]:operation/path`, or any shorthand of it).
 *
 * Wraps `parseNamespaceExpression()` with the two NRP-specific conventions
 * every caller of the old `parseTarget`/`cleaker()` path used to reimplement
 * by hand: the `me://` scheme is optional, and a namespace with no explicit
 * `:operation` defaults to `read` rather than being invalid. Centralized here
 * so any NRP consumer (bridge, mesh, GUI) gets the same shorthand rules
 * instead of each reinventing them.
 */
export declare function parseNrpTarget(input: string): ParsedNamespaceExpression;
//# sourceMappingURL=nrpTarget.d.ts.map