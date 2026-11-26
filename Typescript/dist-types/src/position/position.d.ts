/** The parts of a page's location this needs (window.location, a URL, or a plain object). */
export type PagePlace = {
    protocol: string;
    host: string;
    pathname?: string;
    search?: string;
    hash?: string;
};
export type Surface = {
    /** For drawing: bare when the scheme is the usual one, quoted with it when not. */
    compact: string;
    /** Exact and unambiguous, for copying or resolving: always quoted, scheme included. */
    full: string;
};
export type Position = {
    namespace: string;
    /** The surface, compact ('' when there is no page). */
    surface: string;
    /** `namespace @ surface` (just the namespace when there is no page). */
    expression: string;
    /** `namespace @ "scheme://place"`: exact, for copying or resolving. */
    full: string;
};
/** The path as the place writes it: no trailing slash, no trailing index.html; the root is ''. */
export declare function placePath(pathname: string | undefined): string;
/** The exact place of a page, as a surface. `null` when there is no page (or no host and not a file). */
export declare function surfaceOf(page: PagePlace | null | undefined, options?: {
    forceScheme?: boolean;
}): Surface | null;
/** `namespace @ surface`, the surface being the exact place of `page`. */
export declare function positionOf(namespace: string, page: PagePlace | null | undefined): Position;
/** The current page's location, when there is one (a browser); `null` elsewhere (Node, a worker without location). */
export declare function currentPage(): PagePlace | null;
//# sourceMappingURL=position.d.ts.map