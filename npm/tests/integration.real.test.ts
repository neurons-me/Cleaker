import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import {
  DEFAULT_CLEAKER_DEVELOPMENT_ORIGIN,
  DEFAULT_CLEAKER_NAMESPACE_ORIGIN,
} from '../src/constants.ts';
import Me from 'this.me';
import { ME as WorkspaceMe } from '../../../../this/.me/npm/src/me.ts';
import { run } from './test.util.ts';

function readBody(init?: RequestInit) {
  return JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
}

function isPrimaryOperation(url: string, init: RequestInit | undefined, operation: string) {
  if (!url.endsWith('/')) return false;
  const body = readBody(init);
  return String(body.operation || '') === operation;
}

function openEnvelope(namespace: string, identityHash: string, noise: string, memories: unknown[] = []) {
  return {
    ok: true,
    target: {
      namespace: {
        me: namespace,
        host: namespace,
      },
    },
    identityHash,
    noise,
    openedAt: Date.now(),
    memories,
  };
}

async function withLocation<T>(
  location: { host?: string; hostname?: string; origin?: string; href?: string },
  fn: () => Promise<T> | T,
): Promise<T> {
  const hadOwnLocation = Object.prototype.hasOwnProperty.call(globalThis, 'location');
  const previousLocation = (globalThis as { location?: unknown }).location;

  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: {
      host: location.host || location.hostname || '',
      hostname: location.hostname || location.host || '',
      origin: location.origin || '',
      href: location.href || location.origin || '',
    },
  });

  try {
    return await fn();
  } finally {
    if (hadOwnLocation) {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: previousLocation,
      });
    } else {
      delete (globalThis as { location?: unknown }).location;
    }
  }
}

void run('Integration Real: cleaker(me) binds the actual .me kernel and teaches it remote memories', async () => {
  const me = new Me();
  (me as any).profile.name('Sui');
  const node = cleaker(me, {
    fetcher: async (endpoint: URL | RequestInfo) => {
      const url = String(endpoint);
      assert.ok(url.endsWith('/profile'), 'Resolver should request the real profile endpoint');
      return new Response(JSON.stringify({ ok: true, value: { displayName: 'Ana', origin: 'remote' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  const baselineMemories = Array.isArray(me.memories) ? me.memories.length : 0;

  assert.strictEqual((node as any).profile.name, 'Sui', 'Real kernel local cognition should remain immediate');

  console.log('\n[Real Integration] Simulating node.friends.ana.cleaker.profile.promise against the actual ME runtime...');
  const pending = (node as any).friends.ana.cleaker.profile;
  assert.strictEqual(pending.status, 'pending', 'Wrapper should expose a pending token for real kernel misses');

  const result = await pending.promise;
  console.log('[Real Integration] Remote resolution finished; validating kernel learning...');

  assert.strictEqual(result.ok, true, 'Remote resolution should succeed');
  assert.deepStrictEqual(
    (me as any)('friends.ana.cleaker.profile'),
    { displayName: 'Ana', origin: 'remote' },
    'The real kernel should learn the remote memory into its semantic index',
  );
  assert.deepStrictEqual(
    (node as any).friends.ana.cleaker.profile,
    { displayName: 'Ana', origin: 'remote' },
    'The bound wrapper should expose the learned value immediately after resolution',
  );
  assert.strictEqual(
    me.memories.length,
    baselineMemories + 1,
    'The real kernel log should record exactly one learned remote memory',
  );
  assert.strictEqual(
    me.memories.at(-1)?.path,
    'friends.ana.cleaker.profile',
    'The learned memory should be committed at the intercepted semantic path',
  );

  console.log('[Real Integration] Assertions passed.');
});

void run('Integration Real: triad binding — cleaker(me, { namespace, secret }) auto-opens the vault', async () => {
  const me = new Me();
  const expectedIdentityHash = 'npm-me-identity';

  const triadFetcher: typeof fetch = async (endpoint, init) => {
    const url = String(endpoint);
    if (isPrimaryOperation(url, init as RequestInit | undefined, 'open')) {
      const payload = JSON.parse(String((init as RequestInit | undefined)?.body || '{}')) as {
        identityHash?: string;
      };
      assert.equal(payload.identityHash, expectedIdentityHash);
      return new Response(
        JSON.stringify(openEnvelope('demo.cleaker', 'abc123', 'xrand', [
          { path: 'profile.name', operator: null, expression: 'Triad', value: 'Triad', timestamp: 1 },
        ])),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), { status: 404 });
  };

  // The Binding IS the Identity — no manual .open() call
  const self = cleaker(me, {
    namespace: 'demo.cleaker',
    secret: 'luna',
    identityHash: expectedIdentityHash,
    fetcher: triadFetcher,
  });

  const result = await self.ready;

  assert.ok(result !== null, 'Triad auto-open should resolve');
  assert.strictEqual(result!.status, 'verified', 'Vault should be verified');
  assert.strictEqual(result!.namespace, 'demo.cleaker', 'Namespace should match');
  assert.strictEqual(
    (self as any).profile.name,
    'Triad',
    'Kernel should be hydrated from vault memories without any manual .open() call',
  );

  console.log('[Real Integration] Triad auto-open passed.');
});

void run('Integration Real: cleaker(me, { secret }) derives namespace from active expression + host context', async () => {
  const me = new WorkspaceMe() as any;
  me['@']('ana');
  const expectedIdentityHash = String(me['!']?.identity?.().hash || '');

  let openedNamespace = '';
  const triadFetcher: typeof fetch = async (endpoint, init) => {
    const url = String(endpoint);
    if (isPrimaryOperation(url, init as RequestInit | undefined, 'open')) {
      const payload = JSON.parse(String((init as RequestInit | undefined)?.body || '{}')) as {
        namespace?: string;
        identityHash?: string;
      };
      openedNamespace = String(payload.namespace || '');
      assert.equal(payload.identityHash, expectedIdentityHash);

      return new Response(
        JSON.stringify(openEnvelope(openedNamespace, 'derived-identity', 'derived-noise', [
          { path: 'profile.name', operator: null, expression: 'Ana', value: 'Ana', timestamp: 1 },
        ])),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), { status: 404 });
  };

  await withLocation(
    {
      host: 'cleaker.me',
      hostname: 'cleaker.me',
      origin: 'https://cleaker.me',
      href: 'https://cleaker.me/',
    },
    async () => {
      const self = cleaker(me, {
        secret: 'luna',
        fetcher: triadFetcher,
      });

      const result = await self.ready;
      assert.ok(result !== null, 'Derived triad auto-open should resolve');
      assert.equal(openedNamespace, 'ana.cleaker.me');
      assert.equal(result!.namespace, 'ana.cleaker.me');
      assert.equal(self.getStatus().activeNamespace, 'ana.cleaker.me');
      assert.equal((self as any).profile.name, 'Ana');
    },
  );
});

void run('Integration Real: localhost surfaces default to cleaker.me as the namespace root', async () => {
  const me = new WorkspaceMe() as any;
  me['@']('ana');
  const expectedIdentityHash = String(me['!']?.identity?.().hash || '');

  let openedNamespace = '';
  const hits: string[] = [];
  const triadFetcher: typeof fetch = async (endpoint, init) => {
    const url = String(endpoint);
    hits.push(url);
    if (isPrimaryOperation(url, init as RequestInit | undefined, 'open')) {
      const payload = JSON.parse(String((init as RequestInit | undefined)?.body || '{}')) as {
        namespace?: string;
        identityHash?: string;
      };
      openedNamespace = String(payload.namespace || '');
      assert.equal(payload.identityHash, expectedIdentityHash);

      if (url !== `${DEFAULT_CLEAKER_DEVELOPMENT_ORIGIN}/`) {
        return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), { status: 404 });
      }

      return new Response(
        JSON.stringify(openEnvelope(openedNamespace, 'localhost-identity', 'localhost-noise')),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), { status: 404 });
  };

  await withLocation(
    {
      host: 'localhost:5173',
      hostname: 'localhost',
      origin: 'http://localhost:5173',
      href: 'http://localhost:5173/',
    },
    async () => {
      const self = cleaker(me, {
        secret: 'luna',
        fetcher: triadFetcher,
      });

      const result = await self.ready;
      assert.ok(result !== null, 'Localhost triad auto-open should resolve');
      assert.equal(openedNamespace, 'ana.cleaker.me');
      assert.equal(result!.namespace, 'ana.cleaker.me');
      assert.equal(self.getStatus().activeNamespace, 'ana.cleaker.me');
      assert.deepEqual(hits, [`${DEFAULT_CLEAKER_DEVELOPMENT_ORIGIN}/`]);
    },
  );
});

void run('Integration Real: explicit origin keeps the port as a channel override', async () => {
  const me = new WorkspaceMe() as any;
  me['@']('ana');
  const expectedIdentityHash = String(me['!']?.identity?.().hash || '');

  const hits: string[] = [];
  const triadFetcher: typeof fetch = async (endpoint, init) => {
    const url = String(endpoint);
    hits.push(url);
    if (isPrimaryOperation(url, init as RequestInit | undefined, 'open')) {
      const payload = JSON.parse(String((init as RequestInit | undefined)?.body || '{}')) as {
        namespace?: string;
        identityHash?: string;
      };
      assert.equal(payload.identityHash, expectedIdentityHash);

      return new Response(
        JSON.stringify(openEnvelope(String(payload.namespace || ''), 'explicit-channel-identity', 'explicit-channel-noise')),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), { status: 404 });
  };

  await withLocation(
    {
      host: 'localhost:5173',
      hostname: 'localhost',
      origin: 'http://localhost:5173',
      href: 'http://localhost:5173/',
    },
    async () => {
      const self = cleaker(me, {
        secret: 'luna',
        origin: 'http://localhost:8161',
        fetcher: triadFetcher,
      });

      const result = await self.ready;
      assert.ok(result !== null, 'Explicit origin triad auto-open should resolve');
      assert.equal(result!.namespace, 'ana.cleaker.me');
      assert.deepEqual(hits, ['http://localhost:8161/']);
    },
  );
});

void run('Integration Real: localhost surfaces fall back to cleaker.me when the local daemon is unavailable', async () => {
  const me = new WorkspaceMe() as any;
  me['@']('ana');
  const expectedIdentityHash = String(me['!']?.identity?.().hash || '');

  let openedNamespace = '';
  const hits: string[] = [];
  const triadFetcher: typeof fetch = async (endpoint, init) => {
    const url = String(endpoint);
    hits.push(url);
    if (isPrimaryOperation(url, init as RequestInit | undefined, 'open')) {
      const payload = JSON.parse(String((init as RequestInit | undefined)?.body || '{}')) as {
        namespace?: string;
        identityHash?: string;
      };
      openedNamespace = String(payload.namespace || '');
      assert.equal(payload.identityHash, expectedIdentityHash);

      if (url === `${DEFAULT_CLEAKER_DEVELOPMENT_ORIGIN}/`) {
        return new Response(JSON.stringify({ ok: false, error: 'NETWORK_DOWN' }), { status: 503 });
      }

      if (url === `${DEFAULT_CLEAKER_NAMESPACE_ORIGIN}/`) {
        return new Response(
          JSON.stringify(openEnvelope(openedNamespace, 'public-fallback-identity', 'public-fallback-noise')),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
    }

    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), { status: 404 });
  };

  await withLocation(
    {
      host: 'localhost:5173',
      hostname: 'localhost',
      origin: 'http://localhost:5173',
      href: 'http://localhost:5173/',
    },
    async () => {
      const self = cleaker(me, {
        secret: 'luna',
        fetcher: triadFetcher,
      });

      const result = await self.ready;
      assert.ok(result !== null, 'Public fallback triad auto-open should resolve');
      assert.equal(openedNamespace, 'ana.cleaker.me');
      assert.equal(result!.namespace, 'ana.cleaker.me');
      assert.equal(self.getStatus().activeNamespace, 'ana.cleaker.me');
      assert.equal(hits[0], `${DEFAULT_CLEAKER_DEVELOPMENT_ORIGIN}/`);
      assert.equal(hits.at(-1), `${DEFAULT_CLEAKER_NAMESPACE_ORIGIN}/`);
      assert.ok(
        hits.every((url) => !url.includes(':8161/claims/open')),
        'Default surface candidates should stay host-level and avoid pinning ports',
      );
    },
  );
});

void run('Integration Real: discoverHosts treats localhost and cleaker.me as default surfaces', async () => {
  const me = new WorkspaceMe() as any;
  me['@']('ana');

  await withLocation(
    {
      host: 'localhost:5173',
      hostname: 'localhost',
      origin: 'http://localhost:5173',
      href: 'http://localhost:5173/',
    },
    async () => {
      const self = cleaker(me);
      const hosts = self.discoverHosts();
      const origins = hosts.map((host) => host.origin);
      assert.ok(
        origins.includes(DEFAULT_CLEAKER_DEVELOPMENT_ORIGIN),
        'discoverHosts should include the localhost surface',
      );
      assert.ok(
        origins.includes(DEFAULT_CLEAKER_NAMESPACE_ORIGIN),
        'discoverHosts should include the public cleaker surface',
      );
      assert.ok(hosts.every((host) => host.namespace === 'ana.cleaker.me'));
      assert.ok(
        origins.every((origin) => !origin.includes(':8161')),
        'Default discovered surfaces should not pin localhost to a fixed port',
      );
    },
  );
});

void run('Integration Real: explicit namespace still overrides derived context', async () => {
  const me = new WorkspaceMe() as any;
  me['@']('ana');
  const expectedIdentityHash = String(me['!']?.identity?.().hash || '');

  let openedNamespace = '';
  const triadFetcher: typeof fetch = async (endpoint, init) => {
    const url = String(endpoint);
    if (isPrimaryOperation(url, init as RequestInit | undefined, 'open')) {
      const payload = JSON.parse(String((init as RequestInit | undefined)?.body || '{}')) as {
        namespace?: string;
        identityHash?: string;
      };
      openedNamespace = String(payload.namespace || '');
      assert.equal(payload.identityHash, expectedIdentityHash);

      return new Response(
        JSON.stringify(openEnvelope(openedNamespace, 'override-identity', 'override-noise')),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), { status: 404 });
  };

  await withLocation(
    {
      host: 'cleaker.me',
      hostname: 'cleaker.me',
      origin: 'https://cleaker.me',
      href: 'https://cleaker.me/',
    },
    async () => {
      const self = cleaker(me, {
        namespace: 'manual.cleaker.me',
        secret: 'luna',
        fetcher: triadFetcher,
      });

      const result = await self.ready;
      assert.ok(result !== null, 'Explicit namespace triad auto-open should resolve');
      assert.equal(openedNamespace, 'manual.cleaker.me');
      assert.equal(result!.namespace, 'manual.cleaker.me');
      assert.equal(self.getStatus().activeNamespace, 'manual.cleaker.me');
    },
  );
});

void run('Integration Real: cleaker claims missing namespaces with proof before reopening', async () => {
  const me = new WorkspaceMe() as any;
  me['@']('ana');
  const hits: Array<{ url: string; operation: string }> = [];
  let openAttempts = 0;

  const triadFetcher: typeof fetch = async (endpoint, init) => {
    const url = String(endpoint);
    const payload = readBody(init as RequestInit | undefined);
    const operation = String(payload.operation || '');
    hits.push({ url, operation });

    if (url === 'https://cleaker.me/' && operation === 'open') {
      openAttempts += 1;
      if (openAttempts === 1) {
        return new Response(JSON.stringify({ ok: false, error: 'CLAIM_NOT_FOUND' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify(openEnvelope('ana.cleaker.me', 'claimed-identity', 'claimed-noise', [
          { path: 'profile.name', operator: null, expression: 'Ana', value: 'Ana', timestamp: 1 },
        ])),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    if (url === 'https://cleaker.me/' && operation === 'claim') {
      assert.equal(String(payload.namespace || ''), 'ana.cleaker.me');
      assert.equal(String(payload.secret || ''), 'luna');
      const proof = payload.proof as Record<string, unknown>;
      assert.ok(proof, 'claim should carry proof');
      assert.equal(String(proof.namespace || ''), 'ana.cleaker.me');
      assert.ok(String(proof.signature || '').length > 0);
      assert.ok(String(proof.publicKey || '').length > 0);
      return new Response(
        JSON.stringify({
          ok: true,
          target: {
            namespace: {
              me: 'ana.cleaker.me',
              host: 'ana.cleaker.me',
            },
          },
          identityHash: String(proof.identityHash || ''),
          createdAt: Date.now(),
          publicKey: 'proof-public-key',
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), { status: 404 });
  };

  await withLocation(
    {
      host: 'cleaker.me',
      hostname: 'cleaker.me',
      origin: 'https://cleaker.me',
      href: 'https://cleaker.me/',
    },
    async () => {
      const self = cleaker(me, {
        secret: 'luna',
        fetcher: triadFetcher,
      });

      const result = await self.ready;
      assert.ok(result !== null, 'Claim-then-open triad flow should resolve');
      assert.equal(result!.namespace, 'ana.cleaker.me');
      assert.equal((self as any).profile.name, 'Ana');
      assert.deepEqual(
        hits.map((hit) => hit.operation),
        ['open', 'claim', 'open'],
      );
    },
  );
});
