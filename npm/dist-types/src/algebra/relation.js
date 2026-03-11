import { intersectRegions, isRefinementOf } from './refinement';
export function existenceRelation(target) {
    return {
        kind: 'existence',
        apply() {
            return target;
        },
    };
}
export function identityRelation() {
    return {
        kind: 'identity',
        apply(viewer) {
            return viewer;
        },
    };
}
export function bindingRelation(target) {
    return {
        kind: 'binding',
        apply(viewer) {
            return intersectRegions(viewer, target) ?? target;
        },
    };
}
export function composeRelations(outer, inner) {
    return {
        kind: 'custom',
        apply(viewer) {
            return outer.apply(inner.apply(viewer));
        },
    };
}
export function refinesRelation(candidate, base, viewer) {
    return isRefinementOf(candidate.apply(viewer), base.apply(viewer));
}
//# sourceMappingURL=relation.js.map