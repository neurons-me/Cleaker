import assert from 'node:assert/strict';
import Me from 'this.me';
import cleaker from '../index.ts';
import { run } from './test.util.ts';

const origin = String(process.env.CLEAKER_ORIGIN || 'http://localhost:8161').replace(/\/+$/, '');

async function fetchJson(url: string, init: RequestInit, label: string) {
  try {
    const response = await fetch(url, init);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    throw new Error(
      `[${label}] request failed for ${url}. ` +
        `Start the cleaker server on ${origin}. ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

void run('Remote Replay: remote ledger history collapses into present .me state', async () => {
  const namespace = `replay-${Date.now().toString().slice(-6)}.cleaker`;
  const secret = 'luna';
  const seed = `remote-replay:${namespace}`;
  const identityHash = `kernel:${seed}`;

  console.log('\n[Remote Replay]');
  console.log('origin ->', origin);
  console.log('namespace ->', namespace);

  const claim = await fetchJson(
    `${origin}/claims`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ namespace, secret, identityHash }),
    },
    'claim',
  );
  const claimBody = claim.data as { ok?: boolean; error?: string };
  if (!claimBody.ok && claimBody.error !== 'NAMESPACE_TAKEN') {
    throw new Error(`CLAIM_FAILED: ${String(claimBody.error || claim.response.status)}`);
  }

  const opened0 = await fetchJson(
    `${origin}/claims/open`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ namespace, secret, identityHash }),
    },
    'open:seed',
  );
  const openBody0 = opened0.data as {
    ok?: boolean;
    error?: string;
    identityHash?: string;
    target?: { nrp?: string };
  };
  if (!openBody0.ok || !openBody0.identityHash) {
    throw new Error(`OPEN_FAILED: ${String(openBody0.error || opened0.response.status)}`);
  }

  assert.equal(openBody0.target?.nrp, `me://${namespace}:open/_`);

  const thoughts = [
    { expression: 'profile.name', value: 'Ana' },
    { expression: 'profile.age', value: 25 },
    { expression: 'profile.name', value: 'Anita' },
  ];

  for (const thought of thoughts) {
    const write = await fetchJson(
      `${origin}/`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-host': namespace,
        },
        body: JSON.stringify({
          identityHash: openBody0.identityHash,
          expression: thought.expression,
          value: thought.value,
        }),
      },
      `write:${thought.expression}`,
    );

    const writeBody = write.data as { ok?: boolean; error?: string; target?: { nrp?: string } };
    if (!writeBody.ok) {
      throw new Error(`WRITE_FAILED(${thought.expression}): ${String(writeBody.error || write.response.status)}`);
    }

    assert.equal(writeBody.target?.nrp, `me://${namespace}:write/_`);
  }

  console.log('[Remote Replay] seed thoughts written to remote ledger');

  const self = cleaker(new Me(seed) as any, { namespace, secret, identityHash, origin }) as any;
  const opened = await self.ready;

  assert.ok(opened, 'triad auto-open should hydrate a fresh kernel');
  assert.equal(opened!.status, 'verified');
  assert.equal(self('profile.name'), 'Anita');
  assert.equal(self('profile.age'), 25);

  const remoteName = self.pointer(`me://${namespace}:read/profile.name`);
  const remoteAge = self.pointer(`me://${namespace}:read/profile.age`);

  const resolvedName = await remoteName.resolve({
    origin,
    headers: { 'x-forwarded-host': namespace },
  });
  const resolvedAge = await remoteAge.resolve({
    origin,
    headers: { 'x-forwarded-host': namespace },
  });

  const nameData = resolvedName.data as {
    ok?: boolean;
    target?: { nrp?: string; value?: string };
  };
  const ageData = resolvedAge.data as {
    ok?: boolean;
    target?: { nrp?: string; value?: number };
  };

  assert.equal(resolvedName.ok, true);
  assert.equal(resolvedAge.ok, true);
  assert.equal(nameData.target?.value, 'Anita');
  assert.equal(ageData.target?.value, 25);
  assert.equal(nameData.target?.nrp, `me://${namespace}:read/profile.name`);
  assert.equal(ageData.target?.nrp, `me://${namespace}:read/profile.age`);

  console.log('[Remote Replay] collapsed state -> profile.name =', self('profile.name'));
  console.log('[Remote Replay] collapsed state -> profile.age =', self('profile.age'));
  console.log('[Remote Replay] assertions passed');
});
