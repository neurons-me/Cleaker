import Me from 'this.me';
import cleaker from '../../index.ts';
const namespace = 'jabellae.cleaker';
const secret = 'luna';
const identityHash = 'seeded-hash';
console.log('\n[PHASE A] .me only');
const source = new Me() as any;
source['@']('jabellae');
source.profile.name('Abella.e');
source.profile.bio('Building the semantic web.');
source.profile.pic('https://neurons.me/media/neurons-grey.png');
source.users.ana.name('Ana');
source.users.ana.bio('Designing semantic interfaces.');
source.users.ana.age(22);
source.users.pablo.name('Pablo');
source.users.pablo.bio('Building distributed systems.');
source.users.pablo.age(17);
source.friends.ana['->']('users.ana');
source.friends.pablo['->']('users.pablo');
console.log('friends.ana.bio ->', source('friends.ana.bio'));
console.log('friends.pablo.name ->', source('friends.pablo.name'));
console.log('friends[age > 18].name ->', source('friends[age > 18].name'));
const exported = source.inspect();
const exportedMemories = Array.isArray(exported.memories) ? exported.memories : [];
console.log('source memories ->', exportedMemories.length);
console.log('\n[PHASE B] cleaker + fresh .me (triad hydration)');
const ledgerFetcher: typeof fetch = async (endpoint, init) => {
  const payload =
    init?.body && typeof init.body === 'string'
      ? (JSON.parse(init.body) as { operation?: string })
      : {};

  if (!String(endpoint).endsWith('/') || payload.operation !== 'open') {
    return Response.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }

  return Response.json({
    ok: true,
    namespace,
    identityHash,
    noise: 'seeded-noise',
    openedAt: Date.now(),
    memories: exportedMemories,
  });
};

const self = cleaker(new Me() as any, {
  namespace,
  secret,
  fetcher: ledgerFetcher,
}) as any;

await self.ready;
console.log('self.profile.name ->', self('profile.name'));
console.log('self.friends.ana.bio ->', self('friends.ana.bio'));
console.log('self.friends.pablo.name ->', self('friends.pablo.name'));
console.log('self.friends[age > 18].name ->', self('friends[age > 18].name'));
console.log('\n[RESULT] .me built the model; cleaker rehydrated it in a fresh kernel.');
