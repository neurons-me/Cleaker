import assert from 'node:assert/strict';
import cleaker from '../index';
import { run } from './test.util.ts';

type DemoKernel = {
	profile: {
		name: string;
	};
	learn: (memory: unknown) => void;
	noise?: string;
};

void run('Demo: cleaker(me) binds kernel and hydrates from ledger', async () => {
	console.log('\n=== CLEAKER DEMO (VISIBLE FLOW) ===');

	const namespacePrefix = `demo${Date.now().toString().slice(-6)}`;
	const namespaceFqdn = `${namespacePrefix}.cleaker`;
	const expression = `${namespaceFqdn}:read/profile`;
  const secret = 'luna';
  const identityHash = 'demo-kernel-hash';

  const learned: unknown[] = [];

	const me: DemoKernel = {
		profile: {
			name: 'Sui',
		},
		learn: (memory: unknown) => {
      learned.push(memory);
    },
	};

  const node = cleaker(me);

  console.log(`\n[1] Binding kernel -> cleaker(me)`);

  const claimResponse = await fetch('http://localhost:8161/', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'claim',
      namespace: namespaceFqdn,
      secret,
      identityHash,
    }),
  });
  const claimJson = (await claimResponse.json()) as { ok?: boolean; error?: string };
  if (!claimJson.ok && claimJson.error !== 'NAMESPACE_TAKEN') {
    throw new Error(String(claimJson.error || 'CLAIM_FAILED'));
  }

	console.log('\n[2] Creating remote pointer through bound node...');
	const operation = node.pointer(expression);
	console.log('[2.1] Pointer created');

  console.log('\n[3] Opening namespace through the primary binding...');
	const opened0 = await node.open({
		namespace: namespaceFqdn,
		secret,
		identityHash,
		origin: 'http://localhost:8161',
	});
	console.log('[3.1] First open response:', JSON.stringify(opened0, null, 2));
	assert.equal(opened0.status, 'verified');

	console.log('\n[4] Writing a real memory event to the kernel ledger...');
	const writeResponse = await fetch('http://localhost:8161/', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-host': namespaceFqdn,
		},
		body: JSON.stringify({
			identityHash: opened0.identityHash,
			expression: 'profile',
			value: {
				displayName: 'Ana',
				bio: 'Hello from real ledger demo',
			},
		}),
	});
	const writeJson = (await writeResponse.json()) as {
		ok?: boolean;
		memoryHash?: string | null;
		prevMemoryHash?: string | null;
		path?: string;
		blockId?: string | null;
		timestamp?: number;
	};
	console.log('[4.1] Write response:', JSON.stringify(writeJson, null, 2));
	assert.equal(writeJson.ok, true, 'ledger write should succeed');
	if (typeof writeJson.memoryHash === 'string') {
		assert.equal(writeJson.path, 'profile');
	} else {
		assert.equal(typeof writeJson.blockId, 'string');
		assert.equal(typeof writeJson.timestamp, 'number');
	}

	console.log('\n[5] Opening namespace again (hydration step)...');
  const opened = await node.open({
    namespace: namespaceFqdn,
    secret,
    identityHash,
    origin: 'http://localhost:8161',
  });
  console.log('[5.1] Open response:', JSON.stringify(opened, null, 2));
  assert.equal(opened.status, 'verified');
  assert.equal(opened.namespace, namespaceFqdn);
  assert.equal(typeof me.noise, 'string');
  assert.ok(learned.length >= 1, 'kernel should learn hydrated memories');

	console.log('\n[6] Resolving pointer via real network call...');
	const resolved = await operation.resolve({
		origin: 'http://localhost:8161',
		headers: {
			'x-forwarded-host': namespaceFqdn,
		},
	});
	console.log('[6.1] Resolve response:', JSON.stringify(resolved, null, 2));

	assert.ok(operation, 'operation should return a pointer');
	assert.equal(operation.__ptr.identity.prefix, namespacePrefix);
	assert.equal(operation.__ptr.identity.constant, 'cleaker');
	assert.equal(operation.__ptr.intent.selector, 'read');
	assert.equal(operation.__ptr.intent.path, 'profile');
	assert.equal(resolved.ok, true, 'resolve should call local ledger successfully');

	const resolvedData = resolved.data as {
		ok?: boolean;
		target?: {
			path?: string;
			value?: {
				displayName?: string;
				bio?: string;
			};
		};
	};
	assert.equal(resolvedData.ok, true);
	assert.equal(resolvedData.target?.path, 'profile');
	assert.equal(resolvedData.target?.value?.displayName, 'Ana');
	assert.equal(operation.__ptr.resolution.status, 'connected');

	console.log('\n[7] Assertions passed: bind + open hydration + network resolution are working.');
	console.log('=== END DEMO ===\n');
});
