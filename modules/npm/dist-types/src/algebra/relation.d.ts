import type { NamespaceRegion } from './namespaceRegion';
export type NamespaceRelationKind = 'existence' | 'identity' | 'binding' | 'custom';
export interface NamespaceRelation {
    kind: NamespaceRelationKind;
    apply(viewer: NamespaceRegion): NamespaceRegion;
}
export type SemanticRelation = NamespaceRelation;
export declare function existenceRelation(target: NamespaceRegion): NamespaceRelation;
export declare function identityRelation(): NamespaceRelation;
export declare function bindingRelation(target: NamespaceRegion): NamespaceRelation;
export declare function composeRelations(outer: NamespaceRelation, inner: NamespaceRelation): NamespaceRelation;
export declare function refinesRelation(candidate: NamespaceRelation, base: NamespaceRelation, viewer: NamespaceRegion): boolean;
//# sourceMappingURL=relation.d.ts.map