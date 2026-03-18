import { CleakerError } from './errors';
function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}
function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}
function normalizeType(path, data) {
    const suffix = String(path || '').split('/').pop() || '';
    if (suffix === 'status') {
        if (String(data || '').toLowerCase() === 'revoked') {
            return {
                type: 'REVOKE_HOST',
                severity: 'critical',
                title: 'Host revoked',
                detail: 'The host was explicitly revoked for this identity.',
            };
        }
        return {
            type: 'AUTHORIZE_HOST',
            severity: 'info',
            title: 'Host authorized',
            detail: 'The host is authorized for this identity.',
        };
    }
    if (suffix === 'capabilities') {
        const capabilities = Array.isArray(data) ? data.join(', ') : String(data || 'none');
        return {
            type: 'UPDATE_CAPABILITIES',
            severity: 'info',
            title: 'Capabilities updated',
            detail: `Capabilities: ${capabilities}`,
        };
    }
    if (suffix === 'local_endpoint') {
        return {
            type: 'UPDATE_ENDPOINT',
            severity: 'info',
            title: 'Endpoint updated',
            detail: `Local endpoint: ${String(data || 'unknown')}`,
        };
    }
    if (suffix === 'public_key') {
        return {
            type: 'UPDATE_PUBLIC_KEY',
            severity: 'warning',
            title: 'Public key updated',
            detail: 'Daemon public key was updated for this host.',
        };
    }
    if (suffix === 'attestation') {
        return {
            type: 'ATTESTATION',
            severity: 'warning',
            title: 'Attestation recorded',
            detail: 'A host attestation was appended to the semantic chain.',
        };
    }
    if (suffix === 'last_seen') {
        return {
            type: 'LAST_SEEN',
            severity: 'info',
            title: 'Session activity',
            detail: 'Host session activity timestamp was updated.',
        };
    }
    return {
        type: 'UNKNOWN',
        severity: 'info',
        title: 'Unknown event',
        detail: `Path: ${String(path || '')}`,
    };
}
async function readJson(response) {
    try {
        return await response.json();
    }
    catch {
        return null;
    }
}
export class AuditClient {
    monadBaseUrl;
    fetcher;
    constructor(config) {
        this.monadBaseUrl = normalizeBaseUrl(config.monadBaseUrl);
        this.fetcher = config.fetcher || fetch;
        if (!this.monadBaseUrl) {
            throw new CleakerError('AUDIT_BASE_URL_REQUIRED', 'AuditClient requires monadBaseUrl');
        }
    }
    async getHostHistory(usernameInput, fingerprintInput, limit = 200) {
        const username = normalizeUsername(usernameInput);
        const fingerprint = String(fingerprintInput || '').trim();
        if (!username || !fingerprint) {
            throw new CleakerError('AUDIT_INPUT_INVALID', 'AuditClient requires username and fingerprint');
        }
        const url = `${this.monadBaseUrl}/api/v1/hosts/${encodeURIComponent(username)}/${encodeURIComponent(fingerprint)}/history?limit=${Math.max(1, Math.min(2000, Number(limit || 200)))}`;
        const response = await this.fetcher(url, {
            method: 'GET',
            headers: {
                accept: 'application/json',
            },
        });
        const payload = await readJson(response);
        if (!response.ok) {
            const code = payload?.error || `HTTP_${response.status}`;
            throw new CleakerError('AUDIT_HISTORY_FAILED', `Host history request failed: ${code}`);
        }
        const data = (payload?.data || payload);
        const memories = Array.isArray(data?.memories) ? data.memories : [];
        return memories.map((memory) => {
            const mapped = normalizeType(memory.path, memory.data);
            return {
                id: memory.id,
                type: mapped.type,
                severity: mapped.severity,
                title: mapped.title,
                detail: mapped.detail,
                timestamp: Number(memory.timestamp || 0),
                hash: String(memory.hash || ''),
                prevHash: String(memory.prevHash || ''),
                signature: memory.signature ? String(memory.signature) : null,
                raw: memory,
            };
        });
    }
}
//# sourceMappingURL=audit.js.map