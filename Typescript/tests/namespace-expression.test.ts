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

// COMPATIBILITY CHANGE (was: `parsed.constant === 'localhost:8191'`, "localhost namespace keeps http transport and port").
// A port belongs to the TRANSPORT, never to the namespace's identity, `localhost` included: `localhost:8191` and
// `localhost:8192` are the SAME namespace reached through two different origins. The port is still in the transport
// (`transport.port`, `transport.origin`) and in the written `expression`.
run('NS1 - localhost keeps its namespace across ports; the port rides on the transport', () => {
  const parsed = parseNamespaceExpression('localhost:8191');
  assert.equal(parsed.constant, 'localhost');
  assert.equal(parsed.fqdn, 'localhost');
  assert.equal(parsed.transport.port, 8191);
  assert.equal(parsed.transport.origin, 'http://localhost:8191');
  assert.equal(parsed.expression, 'localhost:8191', 'the written door round-trips');
});

run('NS1b - two ports are one namespace and two transports', () => {
  const a = parseNamespaceExpression('localhost:8191');
  const b = parseNamespaceExpression('localhost:8192');
  assert.equal(a.constant, b.constant);
  assert.notEqual(a.transport.origin, b.transport.origin);
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
