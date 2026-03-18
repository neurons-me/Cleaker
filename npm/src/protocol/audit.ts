import { CleakerError } from './errors';

export type TimelineEventType =
  | 'AUTHORIZE_HOST'
  | 'REVOKE_HOST'
  | 'UPDATE_CAPABILITIES'
  | 'UPDATE_ENDPOINT'
  | 'UPDATE_PUBLIC_KEY'
  | 'ATTESTATION'
  | 'LAST_SEEN'
  | 'UNKNOWN';

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

function normalizeBaseUrl(value: string): string {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeUsername(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeType(path: string, data: unknown): Pick<TimelineEvent, 'type' | 'severity' | 'title' | 'detail'> {
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

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export class AuditClient {
  private readonly monadBaseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(config: AuditClientConfig) {
    this.monadBaseUrl = normalizeBaseUrl(config.monadBaseUrl);
    this.fetcher = config.fetcher || fetch;
    if (!this.monadBaseUrl) {
      throw new CleakerError('AUDIT_BASE_URL_REQUIRED', 'AuditClient requires monadBaseUrl');
    }
  }

  async getHostHistory(usernameInput: string, fingerprintInput: string, limit = 200): Promise<TimelineEvent[]> {
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
      const code = (payload as { error?: string } | null)?.error || `HTTP_${response.status}`;
      throw new CleakerError('AUDIT_HISTORY_FAILED', `Host history request failed: ${code}`);
    }

    const data = ((payload as { data?: { memories?: HostMemoryEvent[] } } | null)?.data || payload) as {
      memories?: HostMemoryEvent[];
    };

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
