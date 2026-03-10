import type { NamespaceRegion } from './namespaceRegion';
export declare function isRefinementOf(candidate: NamespaceRegion, base: NamespaceRegion): boolean;
export declare function isSubsetOf(candidate: NamespaceRegion, base: NamespaceRegion): boolean;
export declare const isRefinement: typeof isRefinementOf;
export declare function intersectRegions(left: NamespaceRegion, right: NamespaceRegion): NamespaceRegion | null;
//# sourceMappingURL=refinement.d.ts.map