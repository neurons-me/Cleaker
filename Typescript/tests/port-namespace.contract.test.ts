// The contract we want: a port belongs to the TRANSPORT, never to the namespace's identity.
//   * name.space and name.space:8080 name the SAME namespace;
//   * they are still two transports (two doors), and that has to be said by the transport, not inferred from the name;
//   * a port written in a namespace reaches the transport instead of being dropped;
//   * what is signed, echoed and compared is the bare namespace.
//
// These FAIL on the base where the port contaminates the namespace; each failure is a place to fix. Run:
//   npx tsx tests/port-namespace.contract.test.ts
// (the characterization file next to this one documents the current behavior and passes.)
import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import { parseNamespaceExpression } from '../src/namespace/expression.ts';

const ME_EXPRESSION_SYMBOL = Symbol.for('me.expression');
const results: Array<{ name: string; ok: boolean; detail: string }> = [];
async function contract(name: string, fn: () => Promise<void> | void) {
  try { await fn(); results.push({ name, ok: true, detail: '' }); console.log(`PASS ${name}`); }
  catch (e: any) { results.push({ name, ok: false, detail: String(e.message).split('\n')[0] }); console.log(`FAIL ${name}\n       ${String(e.message).split('\n')[0]}`); }
}

async function signInThrough(base: string, namespace: string) {
  const asked: string[] = [];
  const calls: Array<{ url: string; body: any }> = [];
  const kernel: any = () => undefined;
  kernel[ME_EXPRESSION_SYMBOL] = 'ana'; kernel.learn = () => undefined;
  kernel['!'] = { prove: async ({ rootNamespace, challenge }: any) => { asked.push(rootNamespace); return { identityHash: 'h', expression: 'ana', namespace: `ana.${rootNamespace}`, rootNamespace, challenge: challenge ?? null, publicKey: 'p', message: 'm', signature: 's', timestamp: 1 }; } };
  const fetcher: any = async (u: any, init: any) => { let body: any = {}; try { body = JSON.parse(init.body); } catch { /* none */ } calls.push({ url: String(u), body });
    return new Response(JSON.stringify({ ok: true, namespace: body.namespace, identityHash: 'h', memories: [], openedAt: 1 }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const result: any = await cleaker(kernel, base, { fetcher }).signIn({ namespace });
  return { asked, calls, result };
}

await contract('K1 parse: the constant is the bare name; the port is in the transport', () => {
  const p = parseNamespaceExpression('ana.name.space:8080');
  assert.equal(p.constant, 'name.space');
  assert.equal(p.transport.port, 8080);
});

await contract('K2 name.space and name.space:8080 name the same namespace', () => {
  assert.equal(parseNamespaceExpression('name.space:8080').constant, parseNamespaceExpression('name.space').constant);
});

await contract('K3 ...and are still two different transports', () => {
  const a = parseNamespaceExpression('name.space').transport.origin;
  const b = parseNamespaceExpression('name.space:8080').transport.origin;
  assert.notEqual(a, b);
});

await contract('K4 a port written in the namespace reaches the transport', async () => {
  const { calls } = await signInThrough('name.space', 'ana.name.space:8080');
  assert.ok(calls[0].url.startsWith('https://name.space:8080/'), `went to ${calls[0].url}`);
});

await contract('K5 the answer names the namespace without the port', async () => {
  const { result } = await signInThrough('name.space', 'ana.name.space:8080');
  assert.equal(result.namespace, 'ana.name.space');
});

await contract('K6 the signed namespace is the same through either door', async () => {
  const a = await signInThrough('name.space', 'ana.name.space');
  const b = await signInThrough('name.space:8080', 'ana.name.space:8080');
  assert.equal(a.calls[0].body.namespace, b.calls[0].body.namespace);
  assert.equal(a.asked[0], b.asked[0]);
});

await contract('K7 localhost:8191 is the namespace localhost reached on 8191 (CONFLICTS with tests/namespace-expression.test.ts NS1)', () => {
  const p = parseNamespaceExpression('localhost:8191');
  assert.equal(p.constant, 'localhost');
  assert.equal(p.transport.port, 8191);
});

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} (failures are the places the port still contaminates the namespace)`);
process.exit(failed ? 1 : 0);
