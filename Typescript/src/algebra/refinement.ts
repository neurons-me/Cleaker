import type { NamespaceRegion } from './namespaceRegion';

// A ⊑ B means A refines B by adding coordinates while preserving the same base region.
export function isRefinementOf(candidate: NamespaceRegion, base: NamespaceRegion): boolean {
  if (candidate.domain !== base.domain) return false;
  if (!refinesSubdomain(candidate.subdomain, base.subdomain)) return false;
  if (!refinesCoordinate(candidate.port, base.port)) return false;
  if (!refinesPath(candidate.path, base.path)) return false;
  if (!refinesBind(candidate.bind, base.bind)) return false;
  return true;
}

// In this algebra, more specific regions are subsets of less specific regions.
export function isSubsetOf(candidate: NamespaceRegion, base: NamespaceRegion): boolean {
  return isRefinementOf(candidate, base);
}

// Alias kept for the algebra layer where ⊑ is the primary operator name.
export const isRefinement = isRefinementOf;

export function intersectRegions(
  left: NamespaceRegion,
  right: NamespaceRegion,
): NamespaceRegion | null {
  if (!isSubsetOf(left, right) && !isSubsetOf(right, left)) return null;
  return isSubsetOf(left, right) ? left : right;
}

function refinesSubdomain(candidate: string | null, base: string | null): boolean {
  if (base == null) return true;
  if (candidate == null) return false;
  return candidate === base || candidate.endsWith(`.${base}`);
}

function refinesCoordinate<T>(candidate: T | null, base: T | null): boolean {
  return base == null || candidate === base;
}

function refinesPath(candidate: string[], base: string[]): boolean {
  if (candidate.length < base.length) return false;
  return base.every((segment, index) => candidate[index] === segment);
}

function refinesBind(candidate: NamespaceRegion['bind'], base: NamespaceRegion['bind']): boolean {
  return base === 'none' || candidate === base;
}
