import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import { run } from './test.util.ts';

const ME_EXPRESSION_SYMBOL = Symbol.for('me.expression');

function createMockKernel(expression: string) {
  const memories: unknown[] = [];
  const kernel: any = () => undefined;
  kernel[ME_EXPRESSION_SYMBOL] = expression;
  kernel.learn = (m: unknown) => memories.push(m);
  kernel.noise = '';
  kernel._memories = memories;
  return kernel;
}

type Fetcher = typeof fetch;
type Interceptor = (url: string, body: Record<string, unknown>) => Response | null;

function mockFetcher(intercept: Interceptor): Fetcher {
  return async (endpoint: URL | RequestInfo, init?: RequestInit) => {
    const url = String(endpoint);
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(String(init?.body || '{}')); } catch {}
    const response = intercept(url, body);
    if (response) return response;
    return new Response(JSON.stringify({ ok: false, error: 'NOT_MOCKED' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  };
}

function ok(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

// me["@"]("suiGn")
// cleaker(me, "neurons.me")
// → namespace: suign.neurons.me
// → node.signIn({ secret }) → POST /claims/signIn → hydrates memories into me
void run('Bind: signIn → POST /claims/signIn → memories hydrated into kernel', async () => {
  const me = createMockKernel('suiGn');
  const calls: string[] = [];

  const node = cleaker(me, 'neurons.me', {
    fetcher: mockFetcher((url, body) => {
      calls.push(url);
      if (url === 'https://neurons.me/claims/signIn') {
        assert.equal(body.namespace, 'suign.neurons.me');
        assert.equal(body.secret, 'test-secret');
        return ok({
          namespace: 'suign.neurons.me',
          identityHash: 'abc123',
          noise: 'noise-xyz',
          memories: [
            { path: 'profile.name', operator: '=', expression: 'SuiGn', value: 'SuiGn', timestamp: 1 },
          ],
          openedAt: Date.now(),
        });
      }
      return null;
    }),
  });

  assert.equal(node.getStatus().activeNamespace, 'suign.neurons.me');

  const result = await node.signIn({ namespace: 'suign.neurons.me', secret: 'test-secret' });

  assert.equal(result.status, 'verified');
  assert.equal(result.namespace, 'suign.neurons.me');
  assert.equal(result.identityHash, 'abc123');
  assert.ok(calls.some(u => u === 'https://neurons.me/claims/signIn'));
  assert.equal(me._memories.length, 1);
});

// node.claim({ secret }) → POST /me/kernel:claim/<namespace> → registered
void run('Bind: claim → POST /me/kernel:claim/<namespace>', async () => {
  const me = createMockKernel('suiGn');
  const calls: string[] = [];

  // Proof requires prove() on the kernel — mock it
  me['!'] = {
    prove: async ({ rootNamespace }: { rootNamespace: string }) => ({
      identityHash: 'id-hash',
      expression: 'suign',
      namespace: 'suign.neurons.me',
      rootNamespace,
      publicKey: 'pubkey',
      message: 'msg',
      signature: 'sig',
      timestamp: Date.now(),
    }),
  };

  const node = cleaker(me, 'neurons.me', {
    fetcher: mockFetcher((url) => {
      calls.push(url);
      if (url.startsWith('https://neurons.me/me/kernel:claim/')) {
        return ok({
          namespace: 'suign.neurons.me',
          identityHash: 'id-hash',
          publicKey: 'pubkey',
          createdAt: Date.now(),
        });
      }
      return null;
    }),
  });

  const result = await node.claim({ namespace: 'suign.neurons.me', secret: 'test-secret' });

  assert.equal(result.status, 'verified');
  assert.equal(result.namespace, 'suign.neurons.me');
  assert.ok(calls.some(u => u.includes('/me/kernel:claim/')));
});

// Same me, different spaces → different namespaces, different endpoints
void run('Bind: same identity, different spaces → different namespaces', () => {
  const me = createMockKernel('suiGn');

  const local = cleaker(me, 'sui-desk');
  const cloud = cleaker(me, 'neurons.me');

  assert.equal(local.getStatus().activeNamespace, 'suign.sui-desk.local');
  assert.equal(cloud.getStatus().activeNamespace, 'suign.neurons.me');
});

// Local kernel reads bypass the network
void run('Bind: me://local:read/<path> resolves from kernel without network', async () => {
  const me: any = createMockKernel('suiGn');
  me.profile = { name: 'SuiGn' };
  me.__call = (path: string) => {
    if (path === 'profile.name') return 'SuiGn';
  };
  const kernel: any = (path?: string) => me.__call?.(path);
  Object.assign(kernel, me);

  const node = cleaker(kernel, 'neurons.me', {
    fetcher: async () => { throw new Error('NETWORK_SHOULD_NOT_BE_CALLED'); },
  });

  const ptr = node.pointer('me://local:read/profile.name', {
    fetcher: async () => { throw new Error('NETWORK_SHOULD_NOT_BE_CALLED'); },
  });

  const result = await ptr.resolve();
  assert.equal(result.ok, true);
  assert.equal(ptr.__ptr.transport.protocol, 'local');
});
