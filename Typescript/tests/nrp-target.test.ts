import assert from 'node:assert/strict';
import { parseNrpTarget } from '../src/namespace/nrpTarget';
import { run } from './test.util';

run('NRP0 - accepts shorthand without me:// prefix', () => {
  const parsed = parseNrpTarget('suis-macbook-air.local:read/profile');
  assert.equal(parsed.fqdn, 'suis-macbook-air.local');
  assert.equal(parsed.operation, 'read');
  assert.equal(parsed.path, 'profile');
});

run('NRP1 - full me:// form parses the same as shorthand', () => {
  const parsed = parseNrpTarget('me://suis-macbook-air.local:read/profile');
  assert.equal(parsed.fqdn, 'suis-macbook-air.local');
  assert.equal(parsed.operation, 'read');
});

run('NRP2 - bare namespace with no operation defaults to read', () => {
  // This is the case parseTarget's `allowShorthandRead` was meant to cover but
  // never actually reached (bridge.ts's `cleaker()` call silently dropped that
  // option before it got to parseMeTarget). parseNrpTarget covers it directly.
  const parsed = parseNrpTarget('suis-macbook-air.local/profile');
  assert.equal(parsed.fqdn, 'suis-macbook-air.local');
  assert.equal(parsed.operation, 'read');
  assert.equal(parsed.path, 'profile');
});

run('NRP3 - bare namespace with no path segment defaults to read', () => {
  const parsed = parseNrpTarget('suis-macbook-air.local');
  assert.equal(parsed.fqdn, 'suis-macbook-air.local');
  assert.equal(parsed.operation, 'read');
  assert.equal(parsed.path, '');
});

run('NRP4 - host:port is not misread as namespace:operation', () => {
  const parsed = parseNrpTarget('localhost:8191/profile');
  assert.equal(parsed.fqdn, 'localhost:8191');
  assert.equal(parsed.operation, 'read');
  assert.equal(parsed.path, 'profile');
});

run('NRP5 - explicit operation overrides the read default', () => {
  const parsed = parseNrpTarget('suis-macbook-air.local:write/profile');
  assert.equal(parsed.operation, 'write');
});

run('NRP6 - namespace normalized to lowercase', () => {
  const parsed = parseNrpTarget('SUIS-MACBOOK-AIR.LOCAL:read/profile');
  assert.equal(parsed.fqdn, 'suis-macbook-air.local');
});

run('NRP7 - monad[frank]/path stays intact in path (bridge.ts extracts it separately)', () => {
  const parsed = parseNrpTarget('suign.cleaker.me:read/monad[frank]/projects/x');
  assert.equal(parsed.fqdn, 'suign.cleaker.me');
  assert.equal(parsed.path, 'monad[frank]/projects/x');
});
