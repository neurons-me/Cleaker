import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import Me from 'this.me';
import { run } from './test.util.ts';

void run('Integration Real: cleaker(me) binds the actual .me kernel and teaches it remote memories', async () => {
  const me = new Me();
  (me as any).profile.name('Sui');

  const node = cleaker(me);
  const baselineMemories = Array.isArray(me.memories) ? me.memories.length : 0;

  node.bindKernelResolver({
    resolveOptions: {
      fetcher: async (endpoint: URL | RequestInfo) => {
        const url = String(endpoint);
        assert.ok(url.endsWith('/profile'), 'Resolver should request the real profile endpoint');
        return new Response(JSON.stringify({ ok: true, value: { displayName: 'Ana', origin: 'remote' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  });

  assert.strictEqual(node.profile.name, 'Sui', 'Real kernel local cognition should remain immediate');

  console.log('\n[Real Integration] Simulating node.friends.ana.cleaker.profile.promise against the actual ME runtime...');
  const pending = (node as any).friends.ana.cleaker.profile;
  assert.strictEqual(pending.status, 'pending', 'Wrapper should expose a pending token for real kernel misses');

  const result = await pending.promise;
  console.log('[Real Integration] Remote resolution finished; validating kernel learning...');

  assert.strictEqual(result.ok, true, 'Remote resolution should succeed');
  assert.deepStrictEqual(
    me('friends.ana.cleaker.profile'),
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