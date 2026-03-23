import type { ParseTargetOptions, ParsedTarget } from '../types/target';
import { parseMeTarget } from './parseMeTarget';

export function parseTarget(input: string, options: ParseTargetOptions = {}): ParsedTarget {
  return parseMeTarget(input, options);
}
