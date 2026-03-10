// A ⊑ B means A refines B by adding coordinates while preserving the same base region.
export function isRefinementOf(candidate, base) {
    if (candidate.domain !== base.domain)
        return false;
    if (!refinesSubdomain(candidate.subdomain, base.subdomain))
        return false;
    if (!refinesCoordinate(candidate.port, base.port))
        return false;
    if (!refinesPath(candidate.path, base.path))
        return false;
    if (!refinesBind(candidate.bind, base.bind))
        return false;
    return true;
}
// In this algebra, more specific regions are subsets of less specific regions.
export function isSubsetOf(candidate, base) {
    return isRefinementOf(candidate, base);
}
// Alias kept for the algebra layer where ⊑ is the primary operator name.
export const isRefinement = isRefinementOf;
export function intersectRegions(left, right) {
    if (!isSubsetOf(left, right) && !isSubsetOf(right, left))
        return null;
    return isSubsetOf(left, right) ? left : right;
}
function refinesSubdomain(candidate, base) {
    if (base == null)
        return true;
    if (candidate == null)
        return false;
    return candidate === base || candidate.endsWith(`.${base}`);
}
function refinesCoordinate(candidate, base) {
    return base == null || candidate === base;
}
function refinesPath(candidate, base) {
    if (candidate.length < base.length)
        return false;
    return base.every((segment, index) => candidate[index] === segment);
}
function refinesBind(candidate, base) {
    return base === 'none' || candidate === base;
}
//# sourceMappingURL=refinement.js.map