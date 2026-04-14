import type { UserProfileV1 } from '../protocol/handshake';
import {
  buildNamespaceRecordFromPersistentClaim,
  listPersistentClaims,
  resolvePersistentClaimDirs,
} from '../resolver/persistentClaimSource';
import type {
  LoadedPersistentClaim,
  PersistentClaimDiscoveryOptions,
} from '../resolver/persistentClaimSource';
import type { NamespaceRecord } from '../types/namespace';

export interface RegistryMetadataRecord {
  kind: 'CleakerRegistryMetadataV1';
  version: 1;
  namespace: string;
  profile?: UserProfileV1;
  tags?: string[];
  topics?: string[];
  summary?: string;
}

export interface LoadedRegistryMetadata {
  metadataPath: string;
  metadata: RegistryMetadataRecord;
}

export interface ClaimRegistryEntry {
  namespace: string;
  identityHash: string;
  issuedAt: number;
  claimPath: string;
  namespaceRecord: NamespaceRecord;
  profile: UserProfileV1 | null;
  tags: string[];
  topics: string[];
  summary: string | null;
  metadataPath: string | null;
  rawClaim: LoadedPersistentClaim['claim'];
}

export interface ClaimRegistrySearchHit {
  entry: ClaimRegistryEntry;
  score: number;
  reasons: string[];
}

export interface ClaimRegistryIndexOptions extends PersistentClaimDiscoveryOptions {
  metadataDir?: string;
  metadataDirs?: string[];
}

type FsLike = {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: BufferEncoding): string;
};

type PathLike = {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
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

function normalizeNamespace(namespace: string): string {
  return String(namespace || '').trim().toLowerCase();
}

function sanitizeNamespaceFilename(namespace: string): string {
  return normalizeNamespace(namespace).replace(/[^a-z0-9._-]/g, '_');
}

function normalizeProfile(value: unknown): UserProfileV1 | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const out: UserProfileV1 = {};

  if (typeof record.displayName === 'string' && record.displayName.trim()) {
    out.displayName = record.displayName.trim();
  }
  if (typeof record.avatarUrl === 'string' && record.avatarUrl.trim()) {
    out.avatarUrl = record.avatarUrl.trim();
  }
  if (typeof record.bio === 'string' && record.bio.trim()) {
    out.bio = record.bio.trim();
  }

  return Object.keys(out).length ? out : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniq(value.map((item) => String(item || '').trim().toLowerCase()));
}

function isRegistryMetadataRecord(value: unknown): value is RegistryMetadataRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.kind === 'CleakerRegistryMetadataV1'
    && record.version === 1
    && typeof record.namespace === 'string';
}

export function resolveRegistryMetadataDirs(
  options: Pick<ClaimRegistryIndexOptions, 'metadataDir' | 'metadataDirs' | 'claimDir' | 'claimDirs'> = {},
): string[] {
  const path = getPath();
  if (!path) return [];

  const claimDirs = resolvePersistentClaimDirs(options);
  const explicitMetadataDirs = Array.isArray(options.metadataDirs) ? options.metadataDirs : [];
  const metadataDir = String(options.metadataDir || '').trim();

  return uniq([
    metadataDir,
    ...explicitMetadataDirs,
    ...claimDirs,
    ...claimDirs.map((dir) => path.join(dir, 'public')),
  ]);
}

export function loadRegistryMetadata(
  namespace: string,
  options: Pick<ClaimRegistryIndexOptions, 'metadataDir' | 'metadataDirs' | 'claimDir' | 'claimDirs'> = {},
): LoadedRegistryMetadata | null {
  const fs = getFs();
  const path = getPath();
  if (!fs || !path) return null;

  const normalizedNamespace = normalizeNamespace(namespace);
  if (!normalizedNamespace) return null;

  const baseName = sanitizeNamespaceFilename(normalizedNamespace);
  const candidates = [
    `${baseName}.public.json`,
    `${baseName}.registry.json`,
    `${baseName}.meta.json`,
    `${baseName}.json`,
  ];

  for (const dir of resolveRegistryMetadataDirs(options)) {
    for (const filename of candidates) {
      const metadataPath = path.join(dir, filename);
      if (!fs.existsSync(metadataPath)) continue;

      try {
        const raw = fs.readFileSync(metadataPath, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (!isRegistryMetadataRecord(parsed)) continue;
        if (normalizeNamespace(parsed.namespace) !== normalizedNamespace) continue;
        return {
          metadataPath,
          metadata: parsed,
        };
      } catch {
        continue;
      }
    }
  }

  return null;
}

function buildEntry(
  claim: LoadedPersistentClaim,
  options: ClaimRegistryIndexOptions,
): ClaimRegistryEntry {
  const metadata = loadRegistryMetadata(claim.claim.namespace, options);
  const normalizedProfile = normalizeProfile(metadata?.metadata.profile);
  const tags = normalizeStringArray(metadata?.metadata.tags);
  const topics = normalizeStringArray(metadata?.metadata.topics);
  const summary = typeof metadata?.metadata.summary === 'string' && metadata.metadata.summary.trim()
    ? metadata.metadata.summary.trim()
    : normalizedProfile?.bio || null;

  return {
    namespace: claim.claim.namespace,
    identityHash: claim.claim.identityHash,
    issuedAt: claim.claim.issuedAt,
    claimPath: claim.claimPath,
    namespaceRecord: buildNamespaceRecordFromPersistentClaim(claim, options),
    profile: normalizedProfile,
    tags,
    topics,
    summary,
    metadataPath: metadata?.metadataPath || null,
    rawClaim: claim.claim,
  };
}

function buildSearchTokens(entry: ClaimRegistryEntry): string[] {
  return uniq([
    entry.namespace,
    entry.profile?.displayName,
    entry.profile?.bio,
    entry.summary,
    ...entry.tags,
    ...entry.topics,
  ]).map((token) => token.toLowerCase());
}

function scoreSearch(entry: ClaimRegistryEntry, query: string): ClaimRegistrySearchHit | null {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return null;

  const reasons: string[] = [];
  let score = 0;
  const namespace = entry.namespace.toLowerCase();
  if (namespace === normalizedQuery) {
    score += 120;
    reasons.push('namespace:exact');
  } else if (namespace.includes(normalizedQuery)) {
    score += 70;
    reasons.push('namespace:partial');
  }

  const profileName = entry.profile?.displayName?.toLowerCase() || '';
  if (profileName === normalizedQuery) {
    score += 90;
    reasons.push('profile:exact');
  } else if (profileName.includes(normalizedQuery)) {
    score += 55;
    reasons.push('profile:partial');
  }

  if (entry.tags.includes(normalizedQuery)) {
    score += 50;
    reasons.push('tag:exact');
  }
  if (entry.topics.includes(normalizedQuery)) {
    score += 50;
    reasons.push('topic:exact');
  }

  if (!score) {
    const searchTokens = buildSearchTokens(entry);
    const tokenMatch = searchTokens.some((token) => token.includes(normalizedQuery));
    if (!tokenMatch) return null;
    score += 20;
    reasons.push('token:partial');
  }

  return { entry, score, reasons };
}

function intersect(left: string[], right: string[]): string[] {
  if (!left.length || !right.length) return [];
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function scoreRelated(base: ClaimRegistryEntry, candidate: ClaimRegistryEntry): ClaimRegistrySearchHit | null {
  if (base.namespace === candidate.namespace) return null;

  const sharedTags = intersect(base.tags, candidate.tags);
  const sharedTopics = intersect(base.topics, candidate.topics);
  const reasons: string[] = [];
  let score = 0;

  if (sharedTags.length) {
    score += sharedTags.length * 25;
    reasons.push(`tags:${sharedTags.join(',')}`);
  }
  if (sharedTopics.length) {
    score += sharedTopics.length * 35;
    reasons.push(`topics:${sharedTopics.join(',')}`);
  }

  const baseHost = base.namespace.split('.').slice(1).join('.');
  const candidateHost = candidate.namespace.split('.').slice(1).join('.');
  if (baseHost && baseHost === candidateHost) {
    score += 10;
    reasons.push(`parent:${baseHost}`);
  }

  if (!score) return null;
  return { entry: candidate, score, reasons };
}

export class PersistentClaimRegistry {
  private entries = new Map<string, ClaimRegistryEntry>();

  constructor(private readonly options: ClaimRegistryIndexOptions = {}) {}

  refresh(): ClaimRegistryEntry[] {
    const claims = listPersistentClaims(this.options);
    const next = new Map<string, ClaimRegistryEntry>();

    claims.forEach((claim) => {
      const entry = buildEntry(claim, this.options);
      next.set(entry.namespace.toLowerCase(), entry);
    });

    this.entries = next;
    return this.list();
  }

  list(): ClaimRegistryEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => a.namespace.localeCompare(b.namespace));
  }

  get(namespace: string): ClaimRegistryEntry | null {
    const normalized = normalizeNamespace(namespace);
    if (!normalized) return null;
    return this.entries.get(normalized) || null;
  }

  search(query: string, limit = 10): ClaimRegistrySearchHit[] {
    const hits = this.list()
      .map((entry) => scoreSearch(entry, query))
      .filter((hit): hit is ClaimRegistrySearchHit => hit !== null)
      .sort((a, b) => b.score - a.score || a.entry.namespace.localeCompare(b.entry.namespace));

    return hits.slice(0, Math.max(0, limit));
  }

  related(namespace: string, limit = 10): ClaimRegistrySearchHit[] {
    const base = this.get(namespace);
    if (!base) return [];

    return this.list()
      .map((entry) => scoreRelated(base, entry))
      .filter((hit): hit is ClaimRegistrySearchHit => hit !== null)
      .sort((a, b) => b.score - a.score || a.entry.namespace.localeCompare(b.entry.namespace))
      .slice(0, Math.max(0, limit));
  }
}
