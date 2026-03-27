export interface SemanticPath {
    raw: string;
    namespace: string | null;
    identity: string | null;
    device: string | null;
    host: string | null;
    port: number | null;
    portToken: string | null;
    protocol: string | null;
    selectors: SemanticSelectorGroup[];
    selectorRaw: string | null;
    segments: string[];
    path: string;
}
export interface SemanticSelector {
    type: string;
    value: string;
    raw: string;
}
export type SemanticSelectorGroup = SemanticSelector[];
export interface SurfaceBinding {
    kind: string;
    uri: string | null;
    capabilities: string[];
    selector?: string | null;
}
export interface TransportAddress {
    protocol: string | null;
    host: string | null;
    port: number | null;
    path: string;
    uri: string | null;
    selectorChain: string[];
    surface?: SurfaceBinding | null;
}
export interface SemanticResolveResult {
    semantic: SemanticPath;
    namespace: string | null;
    transport: TransportAddress;
    unresolved: {
        host: boolean;
        port: boolean;
        protocol: boolean;
    };
}
export interface SemanticResolverDefaults {
    namespaceRoot?: string;
    protocol?: string;
    port?: number;
    host?: string;
}
export interface SemanticResolveInput {
    raw: string;
    namespaceRoot?: string;
    defaults?: SemanticResolverDefaults;
    sources?: SemanticResolverSource[];
}
export interface SemanticResolverSource {
    resolveIdentityNamespace?: (input: {
        namespaceRoot: string | null;
        identity: string;
        selectors?: SemanticSelectorGroup[];
    }) => string | null | Promise<string | null>;
    resolveDeviceHost?: (input: {
        namespace: string | null;
        identity: string | null;
        device: string;
        selectors?: SemanticSelectorGroup[];
    }) => string | null | Promise<string | null>;
    resolvePort?: (input: {
        namespace: string | null;
        identity: string | null;
        device: string | null;
        token?: string | null;
        selectors?: SemanticSelectorGroup[];
    }) => number | null | Promise<number | null>;
    resolveProtocol?: (input: {
        namespace: string | null;
        identity: string | null;
        device: string | null;
        token?: string | null;
        selectors?: SemanticSelectorGroup[];
    }) => string | null | Promise<string | null>;
    resolveSurface?: (input: {
        namespace: string | null;
        identity: string | null;
        selectors: SemanticSelectorGroup[];
        group: SemanticSelectorGroup;
        defaults: SemanticResolverDefaults;
    }) => SurfaceBinding | null | Promise<SurfaceBinding | null>;
}
export declare function createWebSurfaceSource(): SemanticResolverSource;
export declare function parseSemanticPath(input: string): SemanticPath;
export declare class SemanticResolver {
    private readonly sources;
    private readonly defaults;
    constructor(sources?: SemanticResolverSource[], defaults?: SemanticResolverDefaults);
    resolve(input: string | SemanticResolveInput): Promise<SemanticResolveResult>;
}
//# sourceMappingURL=semanticResolver.d.ts.map