import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PersistentClaimRegistry,
  loadRegistryMetadata,
  resolveRegistryMetadataDirs,
} from '../index.ts';
import { run } from './test.util.ts';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function createClaim(namespace: string) {
  const pair = crypto.generateKeyPairSync('ed25519');
  const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const digest = crypto.createHash('sha256').update(publicKey).digest('hex');
  const unsigned = {
    kind: 'PersistentClaimV1' as const,
    version: 1 as const,
    namespace,
    identityHash: `identity:${namespace}`,
    publicKey: {
      kid: `sha256:${digest}`,
      alg: 'ed25519',
      key: publicKey,
      source: 'generated',
    },
    proofKey: {
      kid: `sha256:${digest}`,
      alg: 'ed25519',
      key: publicKey,
      source: 'generated',
    },
    issuedAt: Date.now(),
  };

  return {
    ...unsigned,
    signature: {
      alg: 'ed25519',
      value: crypto.sign(null, Buffer.from(stableStringify(unsigned)), pair.privateKey).toString('base64'),
      encoding: 'base64' as const,
    },
  };
}

function writeClaim(dir: string, namespace: string) {
  const claim = createClaim(namespace);
  const filename = `${namespace.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}.json`;
  const claimPath = path.join(dir, filename);
  fs.writeFileSync(claimPath, `${JSON.stringify(claim, null, 2)}\n`, 'utf8');
  return { claim, claimPath };
}

function writeMetadata(dir: string, namespace: string, input: {
  displayName?: string;
  bio?: string;
  tags?: string[];
  topics?: string[];
  summary?: string;
}) {
  const filename = `${namespace.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}.public.json`;
  const metadataPath = path.join(dir, filename);
  fs.writeFileSync(metadataPath, `${JSON.stringify({
    kind: 'CleakerRegistryMetadataV1',
    version: 1,
    namespace,
    profile: {
      displayName: input.displayName,
      bio: input.bio,
    },
    tags: input.tags || [],
    topics: input.topics || [],
    summary: input.summary || undefined,
  }, null, 2)}\n`, 'utf8');
  return metadataPath;
}

void run('Claim indexer: registry indexes claim existence without metadata', async () => {
  const claimsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleaker-registry-'));
  writeClaim(claimsDir, 'ana.cleaker.me');
  writeClaim(claimsDir, 'bella.cleaker.me');

  try {
    const registry = new PersistentClaimRegistry({
      claimDirs: [claimsDir],
      origin: 'http://localhost:8161',
    });

    const entries = registry.refresh();
    assert.equal(entries.length, 2);
    assert.equal(entries[0].namespaceRecord.hosts[0]?.endpoints[0], 'http://localhost:8161');
    assert.equal(registry.get('ana.cleaker.me')?.namespace, 'ana.cleaker.me');
    assert.equal(registry.search('bella')[0]?.entry.namespace, 'bella.cleaker.me');
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true });
  }
});

void run('Claim indexer: registry loads metadata sidecars and computes related matches', async () => {
  const claimsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleaker-registry-'));
  const metadataDir = path.join(claimsDir, 'public');
  fs.mkdirSync(metadataDir, { recursive: true });

  writeClaim(claimsDir, 'username.cleaker.me');
  writeClaim(claimsDir, 'username100.cleaker.me');
  writeClaim(claimsDir, 'noise.cleaker.me');

  writeMetadata(metadataDir, 'username.cleaker.me', {
    displayName: 'Cook Ana',
    bio: 'Recetas de pan y cocina de masa madre.',
    tags: ['food', 'bread'],
    topics: ['pan', 'recetas'],
  });
  writeMetadata(metadataDir, 'username100.cleaker.me', {
    displayName: 'Pan Seeker',
    bio: 'Busco recetas y cocina casera.',
    tags: ['food'],
    topics: ['pan', 'recetas'],
  });
  writeMetadata(metadataDir, 'noise.cleaker.me', {
    displayName: 'Noise',
    bio: 'Criptografía pura.',
    tags: ['crypto'],
    topics: ['zk'],
  });

  try {
    const registry = new PersistentClaimRegistry({
      claimDirs: [claimsDir],
      metadataDirs: [metadataDir],
      origin: 'http://localhost:8161',
    });
    registry.refresh();

    const metadata = loadRegistryMetadata('username.cleaker.me', {
      claimDirs: [claimsDir],
      metadataDirs: [metadataDir],
    });
    assert.ok(metadata);
    assert.equal(metadata?.metadata.profile?.displayName, 'Cook Ana');
    assert.ok(resolveRegistryMetadataDirs({
      claimDirs: [claimsDir],
      metadataDirs: [metadataDir],
    }).includes(metadataDir));

    const search = registry.search('bread');
    assert.equal(search[0]?.entry.namespace, 'username.cleaker.me');

    const related = registry.related('username100.cleaker.me');
    assert.equal(related[0]?.entry.namespace, 'username.cleaker.me');
    assert.ok(related[0]?.reasons.some((reason) => reason.includes('topics:pan,recetas')));
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true });
  }
});
