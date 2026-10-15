// What the code does TODAY with a port in a namespace. These pass against the base; they document the behavior the
// contract tests (port-namespace.contract.test.ts) are about, so the change can be seen as a change.
import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import { composeNamespace, parseNamespaceExpression } from '../src/namespace/expression.ts';
import { run } from './test.util.ts';

const ME_EXPRESSION_SYMBOL = Symbol.for('me.expression');

/** A kernel that signs nothing real: it records the root a proof is asked for and composes the namespace like prove(). */
function recordingKernel(expression: string) {
  const asked: Array<{ rootNamespace: string; challenge: string | null }> = [];
  const kernel: any = () => undefined;
  kernel[ME_EXPRESSION_SYMBOL] = expression;
  kernel.learn = () => undefined;
  kernel['!'] = {
    prove: async ({ rootNamespace, challenge }: { rootNamespace: string; challenge?: string | null }) => {
      asked.push({ rootNamespace, challenge: challenge ?? null });
      return {
        identityHash: 'id-of-' + expression, expression, namespace: `${expression}.${rootNamespace}`, rootNamespace,
        challenge: challenge ?? null, publicKey: 'pk', message: 'm', signature: 's', timestamp: Date.now(),
      };
    },
  };
  return { kernel, asked };
}

function recordingFetcher() {
  const calls: Array<{ url: string; body: any }> = [];
  const fetcher: typeof fetch = async (endpoint: any, init?: RequestInit) => {
    let body: any = {};
    try { body = JSON.parse(String(init?.body || '{}')); } catch { /* none */ }
    calls.push({ url: String(endpoint), body });
    return new Response(JSON.stringify({ ok: true, namespace: body?.proof?.namespace ?? body?.namespace, identityHash: 'id', memories: [], openedAt: Date.now() }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetcher, calls };
}

void run('C1 - a port is inside constant and fqdn today', () => {
  const p = parseNamespaceExpression('ana.name.space:8080');
  assert.equal(p.prefix, 'ana');
  assert.equal(p.constant, 'name.space:8080');
  assert.equal(p.fqdn, 'ana.name.space:8080');
  assert.equal(p.transport.port, 8080);
  // the handle stays a subdomain of the transport host (cleaker's design), and the port rides on it
  assert.equal(p.transport.origin, 'https://ana.name.space:8080');
  assert.equal(parseNamespaceExpression('name.space:8080').transport.origin, 'https://name.space:8080');
});

void run('C2 - name.space and name.space:8080 parse to different constants today', () => {
  assert.notEqual(parseNamespaceExpression('name.space').constant, parseNamespaceExpression('name.space:8080').constant);
  assert.equal(composeNamespace('ana', parseNamespaceExpression('name.space:8080').constant), 'ana.name.space:8080');
});

void run('C3 - the existing localhost contract keeps the port in the constant', () => {
  const p = parseNamespaceExpression('localhost:8191');
  assert.equal(p.constant, 'localhost:8191');
  assert.equal(p.transport.origin, 'http://localhost:8191');
});

// What cleaker's binder (the 'cleaker' session backend) does with a port in the namespace, measured on the base:
//   - the signed root is always the bare root: the port never enters the proof here;
//   - the request goes to the transport of the BASE the node was built with, not to the port written in the namespace
//     (a port in the namespace is silently dropped from the request);
//   - the answer's `namespace` is echoed as it was written, port included, while the body carried the bare one.
async function signInThrough(base: string, namespace: string) {
  const { kernel, asked } = recordingKernel('ana');
  const { fetcher, calls } = recordingFetcher();
  const node = cleaker(kernel, base, { fetcher });
  const result: any = await node.signIn({ namespace });
  return { asked, calls, result };
}

void run('C4 - the binder signs the bare root even when the namespace carries a port', async () => {
  const { asked, calls } = await signInThrough('name.space:8080', 'ana.name.space:8080');
  assert.equal(asked[0].rootNamespace, 'name.space');
  assert.equal(calls[0].body.namespace, 'ana.name.space');
});

void run('C5 - the request goes to the base\'s port, not to the namespace\'s', async () => {
  const withPortInBase = await signInThrough('name.space:8080', 'ana.name.space');
  assert.ok(withPortInBase.calls[0].url.startsWith('https://name.space:8080/'), withPortInBase.calls[0].url);
  const portOnlyInNamespace = await signInThrough('name.space', 'ana.name.space:8080');
  assert.ok(portOnlyInNamespace.calls[0].url.startsWith('https://name.space/'), 'the written port did not reach the transport: ' + portOnlyInNamespace.calls[0].url);
});

void run('C6 - the answer echoes the namespace as written (port included) while the body carried the bare one', async () => {
  const { result, calls } = await signInThrough('name.space', 'ana.name.space:8080');
  assert.equal(calls[0].body.namespace, 'ana.name.space');
  assert.equal(result.namespace, 'ana.name.space:8080');
});

void run('C7 - a loopback root is signed under its .local name today', async () => {
  const { asked, calls } = await signInThrough('localhost:8191', 'ana.localhost:8191');
  assert.equal(asked[0].rootNamespace, 'localhost.local');
  assert.ok(calls[0].url.startsWith('http://localhost.local:8191/'), calls[0].url);
});
