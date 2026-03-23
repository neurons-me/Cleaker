import assert from 'node:assert/strict';
import { parseMeTarget } from '../src/parse/parseMeTarget';

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('parseMeTarget keeps legacy canonical targets working', () => {
  const parsed = parseMeTarget('me://ana.cleaker:read/profile');

  assert.equal(parsed.namespace.fqdn, 'ana.cleaker');
  assert.equal(parsed.namespace.prefix, 'ana');
  assert.equal(parsed.namespace.constant, 'cleaker');
  assert.equal(parsed.operation, 'read');
  assert.equal(parsed.path, 'profile');
  assert.deepEqual(parsed.namespace.context, []);
  assert.equal(parsed.raw, 'me://ana.cleaker:read/profile');
});

run('parseMeTarget expands DNF context branches', () => {
  const parsed = parseMeTarget(
    'me://ana[device:macbook,iphone;protocol:https|host:cdn.neurons.me]:read/profile',
  );

  assert.equal(parsed.namespace.fqdn, 'ana');
  assert.equal(parsed.operation, 'read');
  assert.equal(parsed.path, 'profile');
  assert.equal(parsed.namespace.context.length, 3);
  assert.deepEqual(parsed.namespace.context, [
    [
      { key: 'device', value: 'macbook', raw: 'device:macbook' },
      { key: 'protocol', value: 'https', raw: 'protocol:https' },
    ],
    [
      { key: 'device', value: 'iphone', raw: 'device:iphone' },
      { key: 'protocol', value: 'https', raw: 'protocol:https' },
    ],
    [
      { key: 'host', value: 'cdn.neurons.me', raw: 'host:cdn.neurons.me' },
    ],
  ]);
  assert.equal(
    parsed.raw,
    'me://ana[device:macbook;protocol:https|device:iphone;protocol:https|host:cdn.neurons.me]:read/profile',
  );
});

console.log('me-target parser tests passed.');
