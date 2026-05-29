import type { ParseTargetOptions, ParsedTarget } from '../types/target';
export declare function stringifyMeTarget(target: Pick<ParsedTarget, 'namespace' | 'operation' | 'path'>): string;
export declare function parseMeTarget(input: string, options?: ParseTargetOptions): ParsedTarget;
//# sourceMappingURL=parseMeTarget.d.ts.map