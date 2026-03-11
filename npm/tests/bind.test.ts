import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import { run } from './test.util.ts';
type MockKernel = ((input?: string) => unknown) & {
  profile: { name: string };
  [key: string]: unknown;
};

function createMockKernel(): MockKernel {
  const state: Record<string, unknown> = {
    'profile.name': 'Sui',
  };

  const kernel = ((input?: string) => {
    const key = String(input || '').trim();
    return state[key];
  }) as MockKernel;

  kernel.profile = { name: 'Sui' };
  return kernel;
}

void run('Bind: cleaker(me) wraps kernel and resolves remote reads without kernel hooks', async () => {
  const me = createMockKernel();
  const node = cleaker(me);

  const bound = node.bindKernelResolver({
    resolveOptions: {
      fetcher: async (endpoint: URL | RequestInfo) => {
        const url = String(endpoint);
        assert.ok(url.endsWith('/profile'), 'Resolver should target the correct path');
        return new Response(JSON.stringify({ ok: true, value: { displayName: 'Ana' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  });

  assert.strictEqual(bound, true, 'Wrapper configuration should succeed');

  const localValue = (node as any).profile.name;
  assert.strictEqual(localValue, 'Sui', 'Wrapper should preserve local-first reads');

  console.log('\n[Bind Test] Simulating node.friends.ana.cleaker.profile.promise...');
  const pending = ((node as any).friends.ana.cleaker.profile);
  assert.strictEqual(pending.status, 'pending', 'Wrapper should return a pending remote token');

  const result = await pending.promise;
  console.log('[Bind Test] Delegated resolution finished.');

  const resolvedData = result.data as { ok?: boolean; value?: { displayName: string } };

  assert.strictEqual(result.ok, true, 'The top-level resolution result should be ok');
  assert.strictEqual(resolvedData.ok, true, 'The resolved data object should have ok: true');
  assert.deepStrictEqual(
    resolvedData.value,
    { displayName: 'Ana' },
    'The resolved value should match the mocked response body',
  );
  assert.strictEqual(pending.pointer.__ptr.resolution.status, 'connected');

  console.log('[Bind Test] Assertions passed.');
});

void run('Bind: me://local and me://self resolve against the bound kernel before network', async () => {
  const me = createMockKernel();
  const node = cleaker(me);

  const denyNetwork = async () => {
    throw new Error('NETWORK_SHOULD_NOT_BE_USED');
  };

  const localPointer = node.pointer('me://local:read/profile.name', {
    fetcher: denyNetwork,
  });
  const selfPointer = node.pointer('me://self:read/profile.name', {
    fetcher: denyNetwork,
  });

  const localResult = await localPointer.resolve();
  const selfResult = await selfPointer.resolve();

  assert.equal(localResult.ok, true);
  assert.equal(localResult.status, 200);
  assert.deepEqual(localResult.data, {
    ok: true,
    namespace: 'local',
    path: 'profile.name',
    value: 'Sui',
  });
  assert.equal(localPointer.__ptr.transport.protocol, 'local');
  assert.equal(localPointer.__ptr.transport.resolvedEndpoint, 'me://local:read/profile.name');

  assert.equal(selfResult.ok, true);
  assert.equal(selfResult.status, 200);
  assert.deepEqual(selfResult.data, {
    ok: true,
    namespace: 'self',
    path: 'profile.name',
    value: 'Sui',
  });
  assert.equal(selfPointer.__ptr.transport.protocol, 'local');
  assert.equal(selfPointer.__ptr.transport.resolvedEndpoint, 'me://self:read/profile.name');
});
