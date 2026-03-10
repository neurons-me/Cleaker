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