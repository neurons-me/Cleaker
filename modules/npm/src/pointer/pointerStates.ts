import type { PointerStatus } from '../types/pointer';

export const POINTER_STATUS: PointerStatus[] = [
  'unresolved',
  'resolving',
  'connected',
  'stale',
  'timeout',
  'unauthorized',
  'error',
];
