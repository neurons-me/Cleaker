import type { NamespaceRegion } from '../algebra';
import type { ParsedTarget } from './target';
export type BrowserNamespaceKind = 'local' | 'existence' | 'relation' | 'nrp';
export interface BrowserNamespaceBase {
    kind: BrowserNamespaceKind;
    raw: string;
    hostRegion: NamespaceRegion;
}
export interface BrowserNamespaceLocal extends BrowserNamespaceBase {
    kind: 'local';
    localPath: string[];
}
export interface BrowserNamespaceExistence extends BrowserNamespaceBase {
    kind: 'existence';
    targetRegion: NamespaceRegion;
}
export interface BrowserNamespaceRelation extends BrowserNamespaceBase {
    kind: 'relation';
    targetRegion: NamespaceRegion;
    viewerBinding: 'self';
}
export interface BrowserNamespaceNrp extends BrowserNamespaceBase {
    kind: 'nrp';
    target: ParsedTarget;
    bind: 'none' | 'self';
}
export type ParsedBrowserNamespace = BrowserNamespaceLocal | BrowserNamespaceExistence | BrowserNamespaceRelation | BrowserNamespaceNrp;
//# sourceMappingURL=browser.d.ts.map