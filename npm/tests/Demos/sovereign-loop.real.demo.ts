import Me from 'this.me';
import cleaker from '../../index.ts';

const origin = String(process.env.CLEAKER_ORIGIN || 'http://localhost:8161').replace(/\/+$/, '');
const namespace = String(process.env.CLEAKER_NAMESPACE || `jabellae-${Date.now().toString().slice(-6)}.cleaker`);
const secret = String(process.env.CLEAKER_SECRET || 'luna');
const seed = String(process.env.CLEAKER_SEED || `sovereign-loop:${namespace}`);
const identityHash = String(process.env.CLEAKER_IDENTITY_HASH || `kernel:${seed}`);

async function fetchJson(url: string, init: RequestInit, label: string) {
  try {
    return await fetch(url, init);
  } catch (error) {
    const cause = (error as { cause?: { code?: string } } | null)?.cause;
    const code = String(cause?.code || '');

    if (code === 'CERT_HAS_EXPIRED') {
      throw new Error(
        `[${label}] TLS certificate expired for ${origin}. ` +
          `Use CLEAKER_ORIGIN=http://localhost:8161 while running locally, or renew the remote certificate.`,
      );
    }

    throw new Error(
      `[${label}] request failed for ${url}. ` +
        `If you are working locally, start the cleaker server on http://localhost:8161 ` +
        `or override CLEAKER_ORIGIN. Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log('\n[CONFIG]');
console.log('origin ->', origin);
console.log('namespace ->', namespace);

console.log('\n[PHASE A] .me only');
const source = new Me(seed) as any;

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

console.log('\n[PHASE B] claim/open/write on cleaker server');

const claimResponse = await fetchJson(`${origin}/`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ operation: 'claim', namespace, secret, identityHash }),
}, 'claim');
const claimBody = (await claimResponse.json()) as { ok?: boolean; error?: string };
if (!claimBody.ok && claimBody.error !== 'NAMESPACE_TAKEN') {
  throw new Error(`CLAIM_FAILED: ${String(claimBody.error || claimResponse.status)}`);
}

const opened0 = await fetchJson(`${origin}/`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ operation: 'open', namespace, secret, identityHash }),
}, 'open');
const openBody0 = (await opened0.json()) as {
  ok?: boolean;
  error?: string;
  identityHash?: string;
};
if (!openBody0.ok || !openBody0.identityHash) {
  throw new Error(`OPEN_FAILED: ${String(openBody0.error || opened0.status)}`);
}

for (const memory of exportedMemories) {
  const record = (memory ?? {}) as Record<string, unknown>;
  const expression = String(record.path || '').trim();
  if (!expression) continue;

  const value = Object.prototype.hasOwnProperty.call(record, 'value')
    ? record.value
    : record.expression;

  const writeResponse = await fetchJson(`${origin}/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-host': namespace,
    },
    body: JSON.stringify({
      identityHash: openBody0.identityHash,
      expression,
      value,
      payload: memory,
    }),
  }, `write:${expression}`);

  const writeBody = (await writeResponse.json()) as { ok?: boolean; error?: string };
  if (!writeBody.ok) {
    throw new Error(`WRITE_FAILED(${expression}): ${String(writeBody.error || writeResponse.status)}`);
  }
}

console.log('\n[PHASE C] cleaker triad hydration on a fresh .me kernel');
const self = cleaker(new Me(seed) as any, { namespace, secret, identityHash, origin }) as any;
await self.ready;

console.log('self.profile.name ->', self('profile.name'));
console.log('self.friends.ana.bio ->', self('friends.ana.bio'));
console.log('self.friends.pablo.name ->', self('friends.pablo.name'));
console.log('self.friends[age > 18].name ->', self('friends[age > 18].name'));

console.log('\n[RESULT] .me built local thought; cleaker server persisted it; cleaker triad rehydrated it.');
