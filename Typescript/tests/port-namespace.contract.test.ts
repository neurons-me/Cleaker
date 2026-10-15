// The contract we want: a port belongs to the TRANSPORT, never to the namespace's identity.
//   * name.space and name.space:8080 name the SAME namespace;
//   * they are still two transports (two doors), and that has to be said by the transport, not inferred from the name;
//   * a port written in a namespace reaches the transport instead of being dropped;
//   * what is signed, echoed and compared is the bare namespace.
//
// On the BASE these fail where the port contaminates the namespace (5/7 at c1c9c18); the change makes them pass. Run:
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

// Constructing a node binds the kernel and fires a background signIn (the "triad auto-open", see createCleakerSession):
// those requests are recorded apart so a check looks at the EXPLICIT call only.
async function signInThrough(base: string, namespace: string) {
  const asked: string[] = [];
  const all: Array<{ url: string; body: any }> = [];
  const kernel: any = () => undefined;
  kernel[ME_EXPRESSION_SYMBOL] = 'ana'; kernel.learn = () => undefined;
  kernel['!'] = { prove: async ({ rootNamespace, challenge }: any) => { asked.push(rootNamespace); return { identityHash: 'h', expression: 'ana', namespace: `ana.${rootNamespace}`, rootNamespace, challenge: challenge ?? null, publicKey: 'p', message: 'm', signature: 's', timestamp: 1 }; } };
  const fetcher: any = async (u: any, init: any) => { let body: any = {}; try { body = JSON.parse(init.body); } catch { /* none */ } all.push({ url: String(u), body });
    return new Response(JSON.stringify({ ok: true, namespace: body.namespace, identityHash: 'h', memories: [], openedAt: 1 }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const node = cleaker(kernel, base, { fetcher });
  await new Promise((r) => setTimeout(r, 50));            // let the background auto-open settle
  const before = all.length;
  let result: any = null; let error: string | null = null;
  try { result = await node.signIn({ namespace }); } catch (e: any) { error = String(e?.message || e); }
  const calls = all.slice(before);
  return { asked, calls, result, error, node, all };
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

await contract('K8 the scheme is not lost: loopback stays http, a public name stays https', async () => {
  const local = await signInThrough('localhost', 'ana.localhost:8191');
  assert.ok(local.calls[0].url.startsWith('http://localhost:8191/'), local.calls[0].url);
  const pub = await signInThrough('name.space', 'ana.name.space:8080');
  assert.ok(pub.calls[0].url.startsWith('https://name.space:8080/'), pub.calls[0].url);
});

await contract('K9 a written port that contradicts the node\'s own transport is a conflict, and nothing is sent', async () => {
  const r = await signInThrough('name.space:9090', 'ana.name.space:8080');
  assert.equal(r.error, 'TRANSPORT_PORT_CONFLICT');
  assert.equal(r.calls.length, 0, 'no request for the explicit call');
});

await contract('K10 the same port written twice is not a conflict', async () => {
  const r = await signInThrough('name.space:8080', 'ana.name.space:8080');
  assert.equal(r.error, null);
  assert.ok(r.calls[0].url.startsWith('https://name.space:8080/'));
});

await contract('K11 the written address round-trips (expression keeps the door), fqdn and constant do not carry it', () => {
  const p = parseNamespaceExpression('ana.name.space:8080/profile');
  assert.equal(p.expression, 'ana.name.space:8080/profile');
  assert.equal(p.fqdn, 'ana.name.space');
  assert.equal(p.constant, 'name.space');
});

await contract('K12 two doors of one namespace are independent: signing in through one sends nothing to the other', async () => {
  const a = await signInThrough('name.space', 'ana.name.space');
  const b = await signInThrough('name.space:8080', 'ana.name.space');
  assert.ok(a.all.every((c) => !c.url.includes(':8080')), 'door A never touched :8080');
  assert.ok(b.all.every((c) => c.url.startsWith('https://name.space:8080/')), 'door B only used :8080');
});

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} (failures are the places the port still contaminates the namespace)`);
process.exit(failed ? 1 : 0);
