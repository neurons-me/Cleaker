import assert from 'node:assert/strict';
import {
  composeNamespace,
  parseNamespaceExpression,
  stringifyNamespaceExpression,
} from '../src/namespace/expression';
import { run } from './test.util';

run('NS0 - default cleaker namespace resolves to public origin', () => {
  const parsed = parseNamespaceExpression('cleaker.me');
  assert.equal(parsed.constant, 'cleaker.me');
  assert.equal(parsed.prefix, null);
  assert.equal(parsed.transport.origin, 'https://cleaker.me');
});

run('NS1 - localhost namespace keeps http transport and port', () => {
  const parsed = parseNamespaceExpression('localhost:8191');
  assert.equal(parsed.constant, 'localhost:8191');
  assert.equal(parsed.transport.origin, 'http://localhost:8191');
});

run('NS2 - username prefix projects onto constant', () => {
  const parsed = parseNamespaceExpression('jabellae.cleaker.me');
  assert.equal(parsed.prefix, 'jabellae');
  assert.equal(parsed.constant, 'cleaker.me');
  assert.equal(composeNamespace('ana', parsed.constant), 'ana.cleaker.me');
});

run('NS2b - localhost keeps user prefix as a projected namespace', () => {
  const parsed = parseNamespaceExpression('ana.localhost');
  assert.equal(parsed.prefix, 'ana');
  assert.equal(parsed.constant, 'localhost');
  assert.equal(composeNamespace('bella', parsed.constant), 'bella.localhost');
});

run('NS3 - selector host overrides transport origin', () => {
  const parsed = parseNamespaceExpression('cleaker.me[host:localhost|protocol:http|port:8161]');
  assert.equal(parsed.constant, 'cleaker.me');
  assert.equal(parsed.transport.origin, 'http://localhost:8161');
});

run('NS4 - operation and path roundtrip stays stable', () => {
  const parsed = parseNamespaceExpression('cleaker.me[host:localhost|protocol:http|port:8161]:open/profile');
  assert.equal(parsed.operation, 'open');
  assert.equal(parsed.path, 'profile');
  assert.equal(
    stringifyNamespaceExpression(parsed),
    'cleaker.me[host:localhost|protocol:http|port:8161]:open/profile',
  );
});

console.log('All cleaker namespace expression tests passed.');
