export type TimelineEventType = 'AUTHORIZE_HOST' | 'REVOKE_HOST' | 'UPDATE_CAPABILITIES' | 'UPDATE_ENDPOINT' | 'UPDATE_PUBLIC_KEY' | 'ATTESTATION' | 'LAST_SEEN' | 'UNKNOWN';
export type TimelineSeverity = 'info' | 'warning' | 'critical';
export interface HostMemoryEvent {
    id: number;
    namespace: string;
    username: string;
    fingerprint: string;
    path: string;
    operator: string | null;
    data: unknown;
    hash: string;
    prevHash: string;
    signature: string | null;
    timestamp: number;
}
export interface TimelineEvent {
    id: number;
    type: TimelineEventType;
    severity: TimelineSeverity;
    title: string;
    detail: string;
    timestamp: number;
    hash: string;
    prevHash: string;
    signature: string | null;
    raw: HostMemoryEvent;
}
export interface AuditClientConfig {
    monadBaseUrl: string;
    fetcher?: typeof fetch;
}
export declare class AuditClient {
    private readonly monadBaseUrl;
    private readonly fetcher;
    constructor(config: AuditClientConfig);
    getHostHistory(usernameInput: string, fingerprintInput: string, limit?: number): Promise<TimelineEvent[]>;
}
//# sourceMappingURL=audit.d.ts.map