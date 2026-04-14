import type {
  NamespacePublicKey,
  NamespaceRecord,
  NamespaceSelectorPolicy,
} from '../types/namespace';
import type { NamespaceRecordLookupInput, NamespaceRecordSource } from './namespaceRecord';

export interface PersistentClaimPublicKey {
  kid: string;
  alg: string;
  key: string;
  source?: string;
}

export interface PersistentClaimSignature {
  alg: string;
  value: string;
  encoding: 'base64';
}

export interface PersistentClaimRecord {
  kind: 'PersistentClaimV1';
  version: 1;
  namespace: string;
  identityHash: string;
  publicKey: PersistentClaimPublicKey;
  proofKey: PersistentClaimPublicKey;
  issuedAt: number;
  signature: PersistentClaimSignature;
}

export interface LoadedPersistentClaim {
  claimPath: string;
  claim: PersistentClaimRecord;
}

export interface PersistentClaimDiscoveryOptions {
  claimDir?: string;
  claimDirs?: string[];
  origin?: string;
  origins?: string[];
  hostId?: string;
  selectors?: Record<string, NamespaceSelectorPolicy>;
  verifySignatures?: boolean;
}

type FsLike = {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: BufferEncoding): string;
  readdirSync(path: string): string[];
};

type PathLike = {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
};

type PublicKeyLike = {
  asymmetricKeyType?: string;
};

type CryptoLike = {
  createPublicKey(key: string): PublicKeyLike;
  verify(
    algorithm: string | null,
    data: Buffer,
    key: PublicKeyLike,
    signature: Buffer,
  ): boolean;
};

type CommonJsGlobalLike = typeof globalThis & {
  require?: NodeRequire;
  module?: {
    require?: NodeRequire;
  };
};

function getGlobalRequire(): NodeRequire | null {
  const candidate = globalThis as CommonJsGlobalLike;
  if (typeof candidate.require === 'function') return candidate.require;
  if (candidate.module && typeof candidate.module.require === 'function') {
    return candidate.module.require;
  }
  return null;
}

function getBuiltinModule<T>(...names: string[]): T | null {
  if (typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function') {
    for (const name of names) {
      try {
        return process.getBuiltinModule(name) as T;
      } catch {
        // Ignore and try the next candidate.
      }
    }
  }

  try {
    const req = getGlobalRequire();
    if (!req) return null;

    for (const name of names) {
      try {
        return req(name) as T;
      } catch {
        // Ignore and try the next candidate.
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getFs(): FsLike | null {
  return getBuiltinModule<FsLike>('node:fs', 'fs');
}

function getPath(): PathLike | null {
  return getBuiltinModule<PathLike>('node:path', 'path');
}

function getCrypto(): CryptoLike | null {
  return getBuiltinModule<CryptoLike>('node:crypto', 'crypto');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function normalizeNamespace(namespace: string): string {
  return String(namespace || '').trim().toLowerCase();
}

function sanitizeNamespaceFilename(namespace: string): string {
  return normalizeNamespace(namespace).replace(/[^a-z0-9._-]/g, '_');
}

function normalizeOrigin(origin: string): string {
  const raw = String(origin || '').trim();
  if (!raw) return '';
  const withScheme = raw.includes('://') ? raw : `http://${raw}`;
  try {
    const url = new URL(withScheme.endsWith('/') ? withScheme : `${withScheme}/`);
    return url.origin.toLowerCase();
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

function hashFn(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (`00000000${(h >>> 0).toString(16)}`).slice(-8);
}

function computeHostId(origin: string): string {
  return hashFn(normalizeOrigin(origin));
}

function uniq(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  values.forEach((value) => {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });

  return out;
}

function isPublicKeyRecord(value: unknown): value is PersistentClaimPublicKey {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.kid === 'string'
    && typeof record.alg === 'string'
    && typeof record.key === 'string';
}

function isSignatureRecord(value: unknown): value is PersistentClaimSignature {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.alg === 'string'
    && typeof record.value === 'string'
    && record.encoding === 'base64';
}

function isPersistentClaimRecord(value: unknown): value is PersistentClaimRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.kind === 'PersistentClaimV1'
    && record.version === 1
    && typeof record.namespace === 'string'
    && typeof record.identityHash === 'string'
    && typeof record.issuedAt === 'number'
    && isPublicKeyRecord(record.publicKey)
    && isPublicKeyRecord(record.proofKey)
    && isSignatureRecord(record.signature);
}

function verifyPersistentClaimSignature(claim: PersistentClaimRecord): boolean {
  const crypto = getCrypto();
  if (!crypto) return false;

  try {
    const { signature, ...unsigned } = claim;
    const payload = Buffer.from(stableStringify(unsigned));
    const sig = Buffer.from(String(signature.value || ''), 'base64');
    const proofKey = crypto.createPublicKey(claim.proofKey.key);
    const keyType = proofKey.asymmetricKeyType || claim.proofKey.alg;

    if (keyType === 'ed25519' || keyType === 'ed448') {
      return crypto.verify(null, payload, proofKey, sig);
    }

    return crypto.verify('sha256', payload, proofKey, sig);
  } catch {
    return false;
  }
}

function createDefaultSelectors(protocols: string[]): Record<string, NamespaceSelectorPolicy> {
  return {
    read: {
      visibility: 'public',
      protocols,
    },
    write: {
      visibility: 'private',
      protocols,
      auth: ['claim'],
    },
    open: {
      visibility: 'private',
      protocols,
      auth: ['secret'],
    },
    claim: {
      visibility: 'private',
      protocols,
      auth: ['secret'],
    },
  };
}

function resolveOrigins(options: PersistentClaimDiscoveryOptions): string[] {
  const envOrigin = typeof process !== 'undefined'
    ? String(process.env.CLEAKER_CLAIM_ORIGIN || '')
    : '';
  const explicitOrigins = Array.isArray(options.origins) ? options.origins : [];
  const candidateOrigins = uniq([
    options.origin,
    ...explicitOrigins,
    envOrigin,
    'http://localhost:8161',
  ]);
  return candidateOrigins.map((origin) => normalizeOrigin(origin)).filter(Boolean);
}

function deriveProtocols(origins: string[]): string[] {
  const protocols = new Set<string>();
  origins.forEach((origin) => {
    try {
      const protocol = new URL(origin).protocol.replace(/:$/, '').toLowerCase();
      if (protocol) protocols.add(protocol);
    } catch {
      // Ignore invalid origin strings.
    }
  });
  return protocols.size ? Array.from(protocols) : ['http'];
}

function dedupePublicKeys(keys: PersistentClaimPublicKey[]): NamespacePublicKey[] {
  const seen = new Set<string>();
  const out: NamespacePublicKey[] = [];

  keys.forEach((key) => {
    const kid = String(key.kid || '').trim();
    if (!kid || seen.has(kid)) return;
    seen.add(kid);
    out.push({
      kid,
      alg: String(key.alg || '').trim() || 'unknown',
      key: String(key.key || '').trim(),
    });
  });

  return out;
}

export function resolvePersistentClaimDirs(
  options: Pick<PersistentClaimDiscoveryOptions, 'claimDir' | 'claimDirs'> = {},
): string[] {
  const path = getPath();
  if (!path) return [];

  const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function'
    ? process.cwd()
    : '';
  const envClaimDir = typeof process !== 'undefined'
    ? String(process.env.CLEAKER_CLAIM_DIR || process.env.MONAD_CLAIM_DIR || '')
    : '';
  const explicitDirs = Array.isArray(options.claimDirs) ? options.claimDirs : [];

  return uniq([
    options.claimDir,
    ...explicitDirs,
    envClaimDir,
    cwd ? path.resolve(cwd, 'env/claims') : '',
    cwd ? path.resolve(cwd, '../../monad.ai/npm/env/claims') : '',
    cwd ? path.resolve(cwd, 'neurons.me/core/monad.ai/npm/env/claims') : '',
  ]);
}

export function loadPersistentClaimRecord(
  namespace: string,
  options: Pick<PersistentClaimDiscoveryOptions, 'claimDir' | 'claimDirs' | 'verifySignatures'> = {},
): LoadedPersistentClaim | null {
  const fs = getFs();
  const path = getPath();
  if (!fs || !path) return null;

  const normalizedNamespace = normalizeNamespace(namespace);
  if (!normalizedNamespace) return null;

  const verifySignatures = options.verifySignatures !== false;
  const claimFile = `${sanitizeNamespaceFilename(normalizedNamespace)}.json`;

  for (const claimDir of resolvePersistentClaimDirs(options)) {
    const claimPath = path.join(claimDir, claimFile);
    if (!fs.existsSync(claimPath)) continue;

    try {
      const raw = fs.readFileSync(claimPath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (!isPersistentClaimRecord(parsed)) continue;
      if (normalizeNamespace(parsed.namespace) !== normalizedNamespace) continue;
      if (verifySignatures && !verifyPersistentClaimSignature(parsed)) continue;
      return {
        claimPath,
        claim: parsed,
      };
    } catch {
      continue;
    }
  }

  return null;
}

export function listPersistentClaims(
  options: Pick<PersistentClaimDiscoveryOptions, 'claimDir' | 'claimDirs' | 'verifySignatures'> = {},
): LoadedPersistentClaim[] {
  const fs = getFs();
  const path = getPath();
  if (!fs || !path) return [];

  const loaded = new Map<string, LoadedPersistentClaim>();
  const verifySignatures = options.verifySignatures !== false;

  resolvePersistentClaimDirs(options).forEach((claimDir) => {
    try {
      fs.readdirSync(claimDir)
        .filter((entry) => entry.endsWith('.json'))
        .forEach((entry) => {
          const claimPath = path.join(claimDir, entry);
          try {
            const raw = fs.readFileSync(claimPath, 'utf8');
            const parsed = JSON.parse(raw) as unknown;
            if (!isPersistentClaimRecord(parsed)) return;
            if (verifySignatures && !verifyPersistentClaimSignature(parsed)) return;
            const namespace = normalizeNamespace(parsed.namespace);
            if (!namespace || loaded.has(namespace)) return;
            loaded.set(namespace, {
              claimPath,
              claim: parsed,
            });
          } catch {
            // Ignore invalid claim files.
          }
        });
    } catch {
      // Ignore unreadable claim directories.
    }
  });

  return Array.from(loaded.values());
}

export function buildNamespaceRecordFromPersistentClaim(
  loaded: LoadedPersistentClaim,
  options: Omit<PersistentClaimDiscoveryOptions, 'claimDir' | 'claimDirs'> = {},
): NamespaceRecord {
  const origins = resolveOrigins(options);
  const protocols = deriveProtocols(origins);
  const selectors = options.selectors || createDefaultSelectors(protocols);
  const keys = dedupePublicKeys([loaded.claim.publicKey, loaded.claim.proofKey]);

  return {
    constant: loaded.claim.namespace,
    version: loaded.claim.version,
    publicKeys: keys,
    selectors,
    hosts: origins.length
      ? [{
          id: String(options.hostId || computeHostId(origins[0])),
          endpoints: origins,
          transport: protocols,
          attrs: {
            source: 'persistent-claim',
            claimPath: loaded.claimPath,
            issuedAt: loaded.claim.issuedAt,
            identityHash: loaded.claim.identityHash,
          },
        }]
      : [],
    signature: loaded.claim.signature.value,
  };
}

function buildLookupCandidates(
  constant: string,
  lookup: NamespaceRecordLookupInput = {},
): string[] {
  return uniq([
    lookup.fqdn,
    lookup.prefix && constant ? `${lookup.prefix}.${constant}` : '',
    constant,
  ]).map((value) => normalizeNamespace(value));
}

export class PersistentClaimNamespaceRecordSource implements NamespaceRecordSource {
  constructor(private readonly options: PersistentClaimDiscoveryOptions = {}) {}

  async get(constant: string, lookup: NamespaceRecordLookupInput = {}): Promise<NamespaceRecord | null> {
    const candidates = buildLookupCandidates(constant, lookup);
    for (const namespace of candidates) {
      if (!namespace) continue;
      const loaded = loadPersistentClaimRecord(namespace, this.options);
      if (!loaded) continue;
      return buildNamespaceRecordFromPersistentClaim(loaded, this.options);
    }
    return null;
  }
}
