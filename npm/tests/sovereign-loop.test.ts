import assert from 'node:assert/strict';
import Me from 'this.me';
import cleaker from '../index.ts';
import { run } from './test.util.ts';

function showState(label: string, me: any, focus: string[] = []) {
  const state = me.inspect({ last: 5 });
  console.log(`\n=== ${label} ===`);
  console.log('index keys:', Object.keys(state.index || {}).sort());
  for (const p of focus) {
    console.log(`${p} ->`, me(p));
  }
  console.log(
    'last memory events:',
    (state.memories || []).map((t: any) => ({ path: t.path, op: t.operator, value: t.value })),
  );
}

void run('Sovereign Loop: explicit .me + cleaker coexistence via triad hydration', async () => {
  const namespace = 'jabellae.cleaker';
  const secret = 'luna';
  const identityHash = 'seeded-hash';

  // PHASE A: .me alone (local semantic kernel)
  const source = new Me() as any;

  console.log('\n[PHASE A] .me local tree creation walkthrough');
  source['@']('jabellae');
  showState('Identity declared (.me only)', source, ['']);

  source.profile.name('Abella.e');
  source.profile.bio('Building the semantic web.');
  source.profile.pic('https://neurons.me/media/neurons-grey.png');
  showState('Own profile created (.me only)', source, ['profile.name', 'profile.bio', 'profile.pic']);

  source.users.ana.name('Ana');
  source.users.ana.bio('Designing semantic interfaces.');
  source.users.ana.age(22);
  showState('users.ana created (.me only)', source, ['users.ana.name', 'users.ana.bio', 'users.ana.age']);

  source.users.pablo.name('Pablo');
  source.users.pablo.bio('Building distributed systems.');
  source.users.pablo.age(17);
  showState('users.pablo created (.me only)', source, ['users.pablo.name', 'users.pablo.bio', 'users.pablo.age']);

  source.friends.ana['->']('users.ana');
  source.friends.pablo['->']('users.pablo');
  showState('Pointers created (friends -> users) (.me only)', source, ['friends.ana', 'friends.pablo']);

  console.log('\nPointer traversal:');
  console.log('friends.ana.bio ->', source('friends.ana.bio'));
  console.log('friends.pablo.name ->', source('friends.pablo.name'));

  console.log('\nLogical filter result:');
  console.log('friends[age > 18].name ->', source('friends[age > 18].name'));

  showState('Final source state (.me only)', source, [
    'profile.name',
    'friends.ana.bio',
    'friends.pablo.name',
    'friends[age > 18].name',
  ]);

  const exported = source.inspect();
  const exportedMemories = Array.isArray(exported.memories) ? exported.memories : [];
  assert.ok(exportedMemories.length > 0, 'source walkthrough should generate memory events');

  // PHASE B: cleaker layer (network adapter + vault replay)
  console.log('\n[PHASE B] cleaker triad binding over a fresh .me kernel');

  const ledgerFetcher: typeof fetch = async (endpoint, init) => {
    const url = String(endpoint);
    const payload =
      init?.body && typeof init.body === 'string'
        ? (JSON.parse(init.body) as { operation?: string })
        : {};

    if (url.endsWith('/') && payload.operation === 'open') {
      return new Response(
        JSON.stringify({
          ok: true,
          namespace,
          identityHash,
          noise: 'seeded-noise',
          openedAt: Date.now(),
          memories: exportedMemories,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), { status: 404 });
  };

  const self = cleaker(new Me() as any, {
    namespace,
    secret,
    fetcher: ledgerFetcher,
  }) as any;

  console.log('[PHASE B] waiting for triad auto-open...');
  const opened = await self.ready;
  assert.ok(opened, 'triad auto-open should resolve with vault data');
  assert.equal(opened!.status, 'verified');

  showState('Hydrated target state (fresh .me + cleaker replay)', self, [
    'profile.name',
    'friends.ana.bio',
    'friends.pablo.name',
    'friends[age > 18].name',
  ]);

  assert.equal(self('profile.name'), source('profile.name'));
  assert.equal(self('friends.ana.bio'), source('friends.ana.bio'));
  assert.equal(self('friends.pablo.name'), source('friends.pablo.name'));
  assert.deepEqual(self('friends[age > 18].name'), source('friends[age > 18].name'));

  console.log('\n[SOVEREIGN LOOP] .me built the model; cleaker rehydrated the same model in a fresh kernel.');
});
