import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cleaker, {
  CleakerResolver,
  PersistentClaimNamespaceRecordSource,
  listPersistentClaims,
  loadPersistentClaimRecord,
  parseTarget,
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

function createMockKernel() {
  const state: Record<string, unknown> = {
    'profile.name': 'Sui',
  };

  const kernel = ((input?: string) => {
    const key = String(input || '').trim();
    return state[key];
  }) as ((input?: string) => unknown) & {
    profile: { name: string };
    [key: string]: unknown;
  };

  kernel.profile = { name: 'Sui' };
  return kernel;
}

void run('Claim registry: persistent claim source resolves fqdn against localhost monad', async () => {
  const claimsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleaker-claims-'));
  writeClaim(claimsDir, 'ana.cleaker.me');

  try {
    const source = new PersistentClaimNamespaceRecordSource({
      claimDirs: [claimsDir],
      origin: 'http://localhost:8161',
    });
    const resolver = new CleakerResolver(source);
    const resolved = await resolver.resolve(parseTarget('me://ana.cleaker.me:read/profile'));

    assert.equal(resolved.namespaceRecord.constant, 'ana.cleaker.me');
    assert.equal(resolved.endpoint, 'http://localhost:8161');
    assert.equal(resolved.protocol, 'http');
    assert.equal(resolved.namespaceRecord.selectors.read?.visibility, 'public');
    assert.ok(resolved.namespaceRecord.publicKeys.length >= 1);
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true });
  }
});

void run('Claim registry: bindKernel discovers a local host from a persistent claim', async () => {
  const claimsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleaker-claims-'));
  writeClaim(claimsDir, 'ana.cleaker.me');

  try {
    const node = cleaker(createMockKernel(), {
      namespace: 'ana.cleaker.me',
      claimDirs: [claimsDir],
      origin: 'http://localhost:8161',
    }) as {
      discoverHosts: () => Array<{ origin: string; namespace: string; alias?: string }>;
    };

    const hosts = node.discoverHosts();
    assert.equal(hosts.length, 1);
    assert.equal(hosts[0].namespace, 'ana.cleaker.me');
    assert.equal(hosts[0].origin, 'http://localhost:8161');
    assert.equal(hosts[0].alias, 'persistent-claim');

    const loaded = loadPersistentClaimRecord('ana.cleaker.me', { claimDirs: [claimsDir] });
    assert.ok(loaded);
    assert.equal(loaded?.claim.namespace, 'ana.cleaker.me');
    assert.equal(listPersistentClaims({ claimDirs: [claimsDir] }).length, 1);
  } finally {
    fs.rmSync(claimsDir, { recursive: true, force: true });
  }
});
