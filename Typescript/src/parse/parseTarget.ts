import type { ParseTargetOptions, ParsedTarget } from '../types/target';
import { parseMeTarget } from './parseMeTarget';

/**
 * Compatibility wrapper for remote pointer targets.
 *
 * The contextual namespace grammar lives in `parseNamespaceExpression()`;
 * this parser remains for `cleaker("me://...")` remote pointer support.
 */
export function parseTarget(input: string, options: ParseTargetOptions = {}): ParsedTarget {
  return parseMeTarget(input, options);
}
