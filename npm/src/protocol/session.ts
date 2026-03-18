import { CleakerError } from './errors';

export interface HostAttestationPayload {
  fingerprint: string;
  local_endpoint: string;
  attestation: string;
  daemonPublicKey: string;
  capabilities?: string[];
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

const STORAGE_KEY = 'cleaker.session.v1';

function normalizeBaseUrl(value: string): string {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeUsername(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function createDefaultStorage(): SessionStorageAdapter {
  const memory = new Map<string, string>();
  const hasLocalStorage = typeof localStorage !== 'undefined';

  if (!hasLocalStorage) {
    return {
      getItem: (key: string) => memory.get(key) || null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
  }

  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return memory.get(key) || null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        memory.set(key, value);
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch {
        memory.delete(key);
      }
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseEnvelope(payload: unknown): CleakerSessionEnvelope {
  const body = payload as { session?: CleakerSessionEnvelope['session']; token?: string } | null;
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
  private readonly username: string;
  private readonly monadBaseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly storage: SessionStorageAdapter;
  private readonly ttlSeconds?: number;
  private readonly defaultCloudCapabilities: string[];
  private readonly hostAttestor?: SessionOrchestratorConfig['hostAttestor'];
  private readonly listeners = new Set<(state: SessionState) => void>();

  private state: SessionState = {
    mode: 'cloud',
    envelope: null,
    source: 'boot',
    syncedAt: 0,
    error: null,
  };

  constructor(config: SessionOrchestratorConfig) {
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

  getMode(): SessionMode {
    return this.state.mode;
  }

  getState(): SessionState {
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

  getSession(): CleakerSessionEnvelope | null {
    return this.state.envelope
      ? {
          session: { ...this.state.envelope.session },
          token: this.state.envelope.token,
        }
      : null;
  }

  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async sync(options: SessionSyncOptions = {}): Promise<SessionSyncResult> {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setState({
        ...this.state,
        error: message,
      });
      throw error;
    }
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
    this.setState({
      mode: 'cloud',
      envelope: null,
      source: 'boot',
      syncedAt: 0,
      error: null,
    });
  }

  private async createCloudSession(): Promise<CleakerSessionEnvelope> {
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
      const code = (payload as { error?: string } | null)?.error || `HTTP_${response.status}`;
      throw new CleakerError('SESSION_CLOUD_FAILED', `Cloud session failed: ${code}`);
    }

    return parseEnvelope((payload as { data?: unknown } | null)?.data || payload);
  }

  private async tryHostSession(): Promise<CleakerSessionEnvelope | null> {
    if (!this.hostAttestor) return null;

    const nonceRes = await this.fetcher(`${this.monadBaseUrl}/api/v1/session/nonce`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: this.username }),
    });
    const noncePayload = await readJson(nonceRes);
    if (!nonceRes.ok) return null;

    const nonceBody = (noncePayload as { data?: { nonce?: string } } | null)?.data || (noncePayload as { nonce?: string } | null);
    const nonce = String(nonceBody?.nonce || '').trim();
    if (!nonce) return null;

    const attestation = await this.hostAttestor({ username: this.username, nonce });
    if (!attestation) return null;

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
    if (!verifyRes.ok) return null;

    return parseEnvelope((verifyPayload as { data?: unknown } | null)?.data || verifyPayload);
  }

  private hydrateFromStorage(): void {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as SessionState;
      if (!parsed || typeof parsed !== 'object') return;
      if (!parsed.envelope || !parsed.envelope.session || !parsed.envelope.token) return;
      if (Number(parsed.envelope.session.exp || 0) < Date.now()) return;

      this.state = {
        mode: parsed.mode === 'host' ? 'host' : 'cloud',
        envelope: parsed.envelope,
        source: parsed.source === 'remote-host' ? 'remote-host' : parsed.source === 'remote-cloud' ? 'remote-cloud' : 'boot',
        syncedAt: Number(parsed.syncedAt || 0),
        error: null,
      };
    } catch {
      this.storage.removeItem(STORAGE_KEY);
    }
  }

  private setState(next: SessionState): void {
    this.state = next;
    try {
      if (next.envelope) {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        this.storage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage failures
    }

    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch {
        // ignore observer failures
      }
    });
  }
}
