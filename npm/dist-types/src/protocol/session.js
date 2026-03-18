import { CleakerError } from './errors';
const STORAGE_KEY = 'cleaker.session.v1';
function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}
function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}
function createDefaultStorage() {
    const memory = new Map();
    const hasLocalStorage = typeof localStorage !== 'undefined';
    if (!hasLocalStorage) {
        return {
            getItem: (key) => memory.get(key) || null,
            setItem: (key, value) => {
                memory.set(key, value);
            },
            removeItem: (key) => {
                memory.delete(key);
            },
        };
    }
    return {
        getItem: (key) => {
            try {
                return localStorage.getItem(key);
            }
            catch {
                return memory.get(key) || null;
            }
        },
        setItem: (key, value) => {
            try {
                localStorage.setItem(key, value);
            }
            catch {
                memory.set(key, value);
            }
        },
        removeItem: (key) => {
            try {
                localStorage.removeItem(key);
            }
            catch {
                memory.delete(key);
            }
        },
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
function parseEnvelope(payload) {
    const body = payload;
    if (!body || typeof body !== 'object' || !body.session || typeof body.token !== 'string') {
        throw new CleakerError('SESSION_INVALID_RESPONSE', 'Session response missing session/token');
    }
    const session = body.session;
    if (!session.username || !session.mode || !Number.isFinite(session.iat) || !Number.isFinite(session.exp)) {
        throw new CleakerError('SESSION_INVALID_RESPONSE', 'Session object missing mandatory fields');
    }
    return {
        session,
        token: body.token,
    };
}
export class SessionOrchestrator {
    username;
    monadBaseUrl;
    fetcher;
    storage;
    ttlSeconds;
    defaultCloudCapabilities;
    hostAttestor;
    listeners = new Set();
    state = {
        mode: 'cloud',
        envelope: null,
        source: 'boot',
        syncedAt: 0,
        error: null,
    };
    constructor(config) {
        this.username = normalizeUsername(config.username);
        this.monadBaseUrl = normalizeBaseUrl(config.monadBaseUrl);
        this.fetcher = config.fetcher || fetch;
        this.storage = config.storage || createDefaultStorage();
        this.ttlSeconds = config.ttlSeconds;
        this.defaultCloudCapabilities = Array.isArray(config.defaultCloudCapabilities)
            ? config.defaultCloudCapabilities
            : ['profile:read', 'me:public'];
        this.hostAttestor = config.hostAttestor;
        if (!this.username) {
            throw new CleakerError('SESSION_USERNAME_REQUIRED', 'SessionOrchestrator requires username');
        }
        if (!this.monadBaseUrl) {
            throw new CleakerError('SESSION_BASE_URL_REQUIRED', 'SessionOrchestrator requires monadBaseUrl');
        }
        this.hydrateFromStorage();
    }
    getMode() {
        return this.state.mode;
    }
    getState() {
        return {
            ...this.state,
            envelope: this.state.envelope
                ? {
                    session: { ...this.state.envelope.session },
                    token: this.state.envelope.token,
                }
                : null,
        };
    }
    getSession() {
        return this.state.envelope
            ? {
                session: { ...this.state.envelope.session },
                token: this.state.envelope.token,
            }
            : null;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getState());
        return () => {
            this.listeners.delete(listener);
        };
    }
    async sync(options = {}) {
        const preferHost = options.preferHost !== false;
        const forceCloud = options.forceCloud === true;
        try {
            if (!forceCloud && preferHost && this.hostAttestor) {
                const host = await this.tryHostSession();
                if (host) {
                    this.setState({
                        mode: 'host',
                        envelope: host,
                        source: 'remote-host',
                        syncedAt: Date.now(),
                        error: null,
                    });
                    return {
                        mode: 'host',
                        envelope: host,
                        source: 'remote-host',
                        syncedAt: this.state.syncedAt,
                    };
                }
            }
            const cloud = await this.createCloudSession();
            this.setState({
                mode: 'cloud',
                envelope: cloud,
                source: 'remote-cloud',
                syncedAt: Date.now(),
                error: null,
            });
            return {
                mode: 'cloud',
                envelope: cloud,
                source: 'remote-cloud',
                syncedAt: this.state.syncedAt,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.setState({
                ...this.state,
                error: message,
            });
            throw error;
        }
    }
    clear() {
        this.storage.removeItem(STORAGE_KEY);
        this.setState({
            mode: 'cloud',
            envelope: null,
            source: 'boot',
            syncedAt: 0,
            error: null,
        });
    }
    async createCloudSession() {
        const response = await this.fetcher(`${this.monadBaseUrl}/api/v1/session/cloud`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                username: this.username,
                ttlSeconds: this.ttlSeconds,
                capabilities: this.defaultCloudCapabilities,
            }),
        });
        const payload = await readJson(response);
        if (!response.ok) {
            const code = payload?.error || `HTTP_${response.status}`;
            throw new CleakerError('SESSION_CLOUD_FAILED', `Cloud session failed: ${code}`);
        }
        return parseEnvelope(payload?.data || payload);
    }
    async tryHostSession() {
        if (!this.hostAttestor)
            return null;
        const nonceRes = await this.fetcher(`${this.monadBaseUrl}/api/v1/session/nonce`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ username: this.username }),
        });
        const noncePayload = await readJson(nonceRes);
        if (!nonceRes.ok)
            return null;
        const nonceBody = noncePayload?.data || noncePayload;
        const nonce = String(nonceBody?.nonce || '').trim();
        if (!nonce)
            return null;
        const attestation = await this.hostAttestor({ username: this.username, nonce });
        if (!attestation)
            return null;
        const verifyRes = await this.fetcher(`${this.monadBaseUrl}/api/v1/session/host-verify`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                username: this.username,
                nonce,
                host: attestation,
                ttlSeconds: this.ttlSeconds,
            }),
        });
        const verifyPayload = await readJson(verifyRes);
        if (!verifyRes.ok)
            return null;
        return parseEnvelope(verifyPayload?.data || verifyPayload);
    }
    hydrateFromStorage() {
        const raw = this.storage.getItem(STORAGE_KEY);
        if (!raw)
            return;
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object')
                return;
            if (!parsed.envelope || !parsed.envelope.session || !parsed.envelope.token)
                return;
            if (Number(parsed.envelope.session.exp || 0) < Date.now())
                return;
            this.state = {
                mode: parsed.mode === 'host' ? 'host' : 'cloud',
                envelope: parsed.envelope,
                source: parsed.source === 'remote-host' ? 'remote-host' : parsed.source === 'remote-cloud' ? 'remote-cloud' : 'boot',
                syncedAt: Number(parsed.syncedAt || 0),
                error: null,
            };
        }
        catch {
            this.storage.removeItem(STORAGE_KEY);
        }
    }
    setState(next) {
        this.state = next;
        try {
            if (next.envelope) {
                this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
            }
            else {
                this.storage.removeItem(STORAGE_KEY);
            }
        }
        catch {
            // ignore storage failures
        }
        const snapshot = this.getState();
        this.listeners.forEach((listener) => {
            try {
                listener(snapshot);
            }
            catch {
                // ignore observer failures
            }
        });
    }
}
//# sourceMappingURL=session.js.map