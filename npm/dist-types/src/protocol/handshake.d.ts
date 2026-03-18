export type HostCapability = 'sync' | 'sign' | 'local_fs' | string;
export type SessionMode = 'cloud' | 'host';
export type SessionTransport = 'cloud' | 'host-verified';
export interface CleakerSession {
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
}
export interface UserProfileV1 {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
}
export interface UserPublicKeyV1 {
    kid: string;
    algorithm: string;
    publicKey: string;
    createdAt: string;
    revokedAt?: string;
}
export interface UserHostLinkV1 {
    hostFingerprint: string;
    hostLabel?: string;
    daemonVersion?: string;
    capabilities: HostCapability[];
    status: 'pending' | 'authorized' | 'revoked';
    createdAt: string;
    updatedAt: string;
    revokedAt?: string;
    lastSeenAt?: string;
}
export interface UserIdentityRecordV1 {
    username: string;
    identityRoot: string;
    profile?: UserProfileV1;
    publicKeys: UserPublicKeyV1[];
    authorizedHosts: UserHostLinkV1[];
}
export interface LocalHostChallengeRequestV1 {
    username: string;
    requestedCapabilities?: HostCapability[];
}
export interface LocalHostChallengeResponseV1 {
    hostFingerprint: string;
    challengeNonce: string;
    challengeIssuedAt: string;
    challengeExpiresAt: string;
    daemonSignature: string;
    daemonPublicKey: string;
}
export interface RegisterHostRequestV1 {
    username: string;
    hostFingerprint: string;
    challengeNonce: string;
    challengeSignature: string;
    capabilitiesRequested: HostCapability[];
}
export interface RegisterHostResponseV1 {
    user: UserIdentityRecordV1;
    host: UserHostLinkV1;
    authorizationId: string;
    transport: SessionTransport;
}
export interface HostBoundSessionV1 {
    token: string;
    tokenType: 'Bearer';
    username: string;
    hostFingerprint: string;
    transport: SessionTransport;
    issuedAt: string;
    expiresAt: string;
    sessionKeyId: string;
    scope: string[];
}
export interface TransportStateV1 {
    transport: SessionTransport;
    reason?: string;
    hostFingerprint?: string;
}
//# sourceMappingURL=handshake.d.ts.map