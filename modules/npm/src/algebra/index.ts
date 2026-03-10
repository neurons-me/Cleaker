export {
  createNamespaceRegion,
  parseNamespaceRegion,
  namespaceRegionToString,
} from './namespaceRegion';
export type { NamespaceBind, NamespaceRegion, ParseNamespaceRegionOptions } from './namespaceRegion';
export { isRefinement, isRefinementOf, isSubsetOf, intersectRegions } from './refinement';
export {
  bindingRelation,
  composeRelations,
  existenceRelation,
  identityRelation,
  refinesRelation,
} from './relation';
export type { NamespaceRelation, NamespaceRelationKind, SemanticRelation } from './relation';
