import type { NamespaceRegion } from './namespaceRegion';
import { intersectRegions, isRefinementOf } from './refinement';

export type NamespaceRelationKind = 'existence' | 'identity' | 'binding' | 'custom';

export interface NamespaceRelation {
  kind: NamespaceRelationKind;
  apply(viewer: NamespaceRegion): NamespaceRegion;
}

export type SemanticRelation = NamespaceRelation;

export function existenceRelation(target: NamespaceRegion): NamespaceRelation {
  return {
    kind: 'existence',
    apply() {
      return target;
    },
  };
}

export function identityRelation(): NamespaceRelation {
  return {
    kind: 'identity',
    apply(viewer) {
      return viewer;
    },
  };
}

export function bindingRelation(target: NamespaceRegion): NamespaceRelation {
  return {
    kind: 'binding',
    apply(viewer) {
      return intersectRegions(viewer, target) ?? target;
    },
  };
}

export function composeRelations(
  outer: NamespaceRelation,
  inner: NamespaceRelation,
): NamespaceRelation {
  return {
    kind: 'custom',
    apply(viewer) {
      return outer.apply(inner.apply(viewer));
    },
  };
}

export function refinesRelation(
  candidate: NamespaceRelation,
  base: NamespaceRelation,
  viewer: NamespaceRegion,
): boolean {
  return isRefinementOf(candidate.apply(viewer), base.apply(viewer));
}
