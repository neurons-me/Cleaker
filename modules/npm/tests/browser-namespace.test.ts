import assert from 'node:assert/strict';
import {
  browserNamespaceToString,
  parseBrowserNamespace,
} from '../src/parse/parseBrowserNamespace';

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('BNS0 - root host without bind is existence', () => {
  const parsed = parseBrowserNamespace('https://cleaker.me/');
  assert.equal(parsed.kind, 'existence');
  if (parsed.kind !== 'existence') return;
  assert.equal(parsed.hostRegion.domain, 'cleaker.me');
  assert.equal(parsed.targetRegion.path.length, 0);
});

run('BNS1 - root host with bind=self is relation', () => {
  const parsed = parseBrowserNamespace('https://cleaker.me/?bind=self');
  assert.equal(parsed.kind, 'relation');
  if (parsed.kind !== 'relation') return;
  assert.equal(parsed.viewerBinding, 'self');
  assert.equal(parsed.targetRegion.bind, 'self');
});

run('BNS2 - user subtree on host is existence region', () => {
  const parsed = parseBrowserNamespace('https://jabellae.cleaker.me/board');
  assert.equal(parsed.kind, 'existence');
  if (parsed.kind !== 'existence') return;
  assert.equal(parsed.hostRegion.subdomain, 'jabellae');
  assert.deepEqual(parsed.targetRegion.path, ['board']);
});

run('BNS3 - semantic path after slash is treated as NRP by default', () => {
  const parsed = parseBrowserNamespace('https://cleaker.me/ana.cleaker:read/profile');
  assert.equal(parsed.kind, 'nrp');
  if (parsed.kind !== 'nrp') return;
  assert.equal(parsed.target.namespace.prefix, 'ana');
  assert.equal(parsed.target.namespace.constant, 'cleaker');
  assert.equal(parsed.target.intent.selector, 'read');
  assert.equal(parsed.target.intent.path, 'profile');
});

run('BNS4 - semantic path can still bind the viewer', () => {
  const parsed = parseBrowserNamespace('https://cleaker.me/ana.cleaker:read/profile?bind=self');
  assert.equal(parsed.kind, 'nrp');
  if (parsed.kind !== 'nrp') return;
  assert.equal(parsed.bind, 'self');
});

run('BNS5 - reserved docs path stays local', () => {
  const parsed = parseBrowserNamespace('https://cleaker.me/docs');
  assert.equal(parsed.kind, 'local');
  if (parsed.kind !== 'local') return;
  assert.deepEqual(parsed.localPath, ['docs']);
});

run('BNS6 - browser namespace roundtrip stays stable for NRP entry', () => {
  const parsed = parseBrowserNamespace('https://cleaker.me/ana.cleaker:read/profile?bind=self');
  assert.equal(
    browserNamespaceToString(parsed),
    'cleaker.me/ana.cleaker:read/profile?bind=self',
  );
});

console.log('All cleaker browser namespace tests passed.');
