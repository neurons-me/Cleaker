export interface HostAttestationPayload {
    fingerprint: string;
    local_endpoint: string;
    attestation: string;
    daemonPublicKey: string;
    capabilities?: string[];
    label?: string;
    hostname?: string;
}
export type SessionMode = 'cloud' | 'host';
export interface CleakerSessionEnvelope {
    session: {
        username: string;
        mode: SessionMode;
        iat: number;
        exp: number;
        capabilities: string[];
        host?: {
            fingerprint: string;
            local_endpoint: string;
            attestation: string;
        };
    };
    token: string;
}
export interface SessionSyncResult {
    mode: SessionMode;
    envelope: CleakerSessionEnvelope;
    source: 'remote-cloud' | 'remote-host';
    syncedAt: number;
}
export interface SessionState {
    mode: SessionMode;
    envelope: CleakerSessionEnvelope | null;
    source: 'boot' | 'remote-cloud' | 'remote-host';
    syncedAt: number;
    error: string | null;
}
export interface SessionStorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
export interface SessionSyncOptions {
    preferHost?: boolean;
    forceCloud?: boolean;
}
export interface SessionOrchestratorConfig {
    username: string;
    monadBaseUrl: string;
    fetcher?: typeof fetch;
    storage?: SessionStorageAdapter;
    ttlSeconds?: number;
    defaultCloudCapabilities?: string[];
    hostAttestor?: (input: {
        username: string;
        nonce: string;
    }) => Promise<HostAttestationPayload | null>;
}
export declare class SessionOrchestrator {
    private readonly username;
    private readonly monadBaseUrl;
    private readonly fetcher;
    private readonly storage;
    private readonly ttlSeconds?;
    private readonly defaultCloudCapabilities;
    private readonly hostAttestor?;
    private readonly listeners;
    private state;
    constructor(config: SessionOrchestratorConfig);
    getMode(): SessionMode;
    getState(): SessionState;
    getSession(): CleakerSessionEnvelope | null;
    subscribe(listener: (state: SessionState) => void): () => void;
    sync(options?: SessionSyncOptions): Promise<SessionSyncResult>;
    clear(): void;
    private createCloudSession;
    private tryHostSession;
    private hydrateFromStorage;
    private setState;
}
//# sourceMappingURL=session.d.ts.map