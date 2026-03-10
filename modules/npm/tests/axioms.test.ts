import assert from 'node:assert/strict';
import cleaker from '../index.ts';

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('A0 - target grammar resolves namespace, selector and path', () => {
  const remote = cleaker('ana.cleaker:read/profile');
  const ptr = remote.__ptr;
  assert.equal(ptr.identity.prefix, 'ana');
  assert.equal(ptr.identity.constant, 'cleaker');
  assert.equal(ptr.intent.selector, 'read');
  assert.equal(ptr.intent.path, 'profile');
});

run('A1 - cleaker() creates a remote pointer in unresolved state', () => {
  const remote = cleaker('ana.cleaker:read/profile');
  assert.equal(remote.__ptr.kind, 'remote');
  assert.equal(remote.__ptr.identity.prefix, 'ana');
  assert.equal(remote.__ptr.identity.constant, 'cleaker');
  assert.equal(remote.__ptr.resolution.status, 'unresolved');
  assert.equal(remote.__ptr.transport.resolvedEndpoint, null);
});

run('A2 - initial resolution status is deterministic', () => {
  const remote = cleaker('ana.cleaker:read/profile');
  assert.equal(remote.__ptr.resolution.status, 'unresolved');
});

run('A3 - explicit nrp:// targets normalize without mutation of semantics', () => {
  const remote = cleaker('nrp://dev.neurons:api/v1.users.get');
  const ptr = remote.__ptr;
  assert.equal(ptr.identity.prefix, 'dev');
  assert.equal(ptr.identity.constant, 'neurons');
  assert.equal(ptr.intent.selector, 'api');
  assert.equal(ptr.intent.path, 'v1.users.get');
});

console.log('All cleaker axioms passed.');
