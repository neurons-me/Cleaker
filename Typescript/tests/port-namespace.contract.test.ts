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
  const local = await signInThrough('http://localhost', 'ana.localhost:8191');
  assert.ok(/^http:\/\/([a-z.]+\.)?localhost(\.local)?:8191\//.test(local.calls[0].url), local.calls[0].url);
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

// Every destination contacted, and what each one received. `refuse` makes the listed hosts unreachable (fetch throws).
async function contactsWhen(base: string, namespace: string, refuse: (url: string) => boolean) {
  const contacted: Array<{ url: string; signedProof: boolean }> = [];
  const kernel: any = () => undefined;
  kernel[ME_EXPRESSION_SYMBOL] = 'ana'; kernel.learn = () => undefined;
  kernel['!'] = { prove: async ({ rootNamespace, challenge }: any) => ({ identityHash: 'h', expression: 'ana', namespace: `ana.${rootNamespace}`, rootNamespace, challenge: challenge ?? null, publicKey: 'p', message: 'm', signature: 'SIG', timestamp: 1 }) };
  const fetcher: any = async (u: any, init: any) => {
    let body: any = {}; try { body = JSON.parse(init.body); } catch { /* none */ }
    contacted.push({ url: String(u), signedProof: Boolean(body?.proof?.signature) });
    if (refuse(String(u))) throw new TypeError('fetch failed');
    return new Response(JSON.stringify({ ok: true, namespace: body.namespace, identityHash: 'h', memories: [], openedAt: 1 }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const node = cleaker(kernel, base, { fetcher });
  await new Promise((r) => setTimeout(r, 30));
  const before = contacted.length;
  let error: string | null = null;
  try { await node.signIn({ namespace }); } catch (e: any) { error = String(e?.message || e); }
  return { explicit: contacted.slice(before), error };
}

await contract('K13 an explicit door that does not answer FAILS there: no proof reaches any other destination', async () => {
  const r = await contactsWhen('name.space', 'ana.name.space:9901', (u) => u.startsWith('https://name.space:9901/'));
  assert.ok(r.error, 'it fails');
  assert.deepEqual(r.explicit.map((c) => c.url), ['https://name.space:9901/claims/signIn'], `contacted: ${r.explicit.map((c) => c.url).join(', ')}`);
  assert.equal(r.explicit.filter((c) => c.signedProof && !c.url.startsWith('https://name.space:9901/')).length, 0);
});

// contactsWhen with explicit node options (fallbackOrigins)
async function contactsWithOptions(base: string, namespace: string, opts: Record<string, unknown>, refuse: (url: string) => boolean) {
  const contacted: Array<{ url: string; signedProof: boolean }> = [];
  const kernel: any = () => undefined;
  kernel[ME_EXPRESSION_SYMBOL] = 'ana'; kernel.learn = () => undefined;
  kernel['!'] = { prove: async ({ rootNamespace, challenge }: any) => ({ identityHash: 'h', expression: 'ana', namespace: `ana.${rootNamespace}`, rootNamespace, challenge: challenge ?? null, publicKey: 'p', message: 'm', signature: 'SIG', timestamp: 1 }) };
  const fetcher: any = async (u: any, init: any) => {
    let body: any = {}; try { body = JSON.parse(init.body); } catch { /* none */ }
    contacted.push({ url: String(u), signedProof: Boolean(body?.proof?.signature) });
    if (refuse(String(u))) throw new TypeError('fetch failed');
    return new Response(JSON.stringify({ ok: true, namespace: body.namespace, identityHash: 'h', memories: [], openedAt: 1 }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const node = cleaker(kernel, base, { fetcher, ...opts } as any);
  await new Promise((r) => setTimeout(r, 30));
  const before = contacted.length;
  let error: string | null = null;
  try { await node.signIn({ namespace }); } catch (e: any) { error = String(e?.message || e); }
  return { explicit: contacted.slice(before), error };
}

await contract('K14 an address with no door: when its destination fails, NO signed proof goes to the implicit fallbacks', async () => {
  const r = await contactsWhen('name.space', 'ana.name.space', (u) => u.startsWith('https://name.space/'));
  const hosts = r.explicit.filter((c) => c.signedProof).map((c) => new URL(c.url).origin);
  assert.ok(r.error, 'it fails');
  assert.ok(!hosts.includes('https://cleaker.me'), `a proof reached cleaker.me: ${hosts.join(', ')}`);
  assert.ok(!hosts.some((h) => /^http:\/\/localhost(:\d+)?$/.test(h)), `a proof reached localhost: ${hosts.join(', ')}`);
});

await contract('K15 fallbackOrigins is explicit: a proof goes to the listed backup, and only there', async () => {
  const r = await contactsWithOptions('name.space', 'ana.name.space', { fallbackOrigins: ['https://backup.example'] }, (u) => u.startsWith('https://name.space/'));
  const hosts = r.explicit.filter((c) => c.signedProof).map((c) => new URL(c.url).origin);
  assert.deepEqual(hosts, ['https://name.space', 'https://backup.example']);
  assert.equal(r.error, null);
});

await contract('K16 with NO transport declared a signed proof is refused, and nothing is sent', async () => {
  const kernel: any = () => undefined;
  kernel[ME_EXPRESSION_SYMBOL] = 'ana.cleaker.me'; kernel.learn = () => undefined;
  kernel['!'] = { prove: async ({ rootNamespace, challenge }: any) => ({ identityHash: 'h', expression: 'ana', namespace: `ana.${rootNamespace}`, rootNamespace, challenge: challenge ?? null, publicKey: 'p', message: 'm', signature: 'SIG', timestamp: 1 }) };
  const urls: string[] = [];
  const fetcher: any = async (u: any) => { urls.push(String(u)); return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const node = cleaker(kernel, { fetcher } as any);
  await new Promise((r) => setTimeout(r, 30));
  const before = urls.length;
  let error = '';
  try { await node.signIn({ namespace: 'ana.cleaker.me' }); } catch (e: any) { error = String(e?.message || e); }
  assert.equal(error, 'TRANSPORT_NOT_DECLARED');
  assert.equal(urls.length - before, 0, `requests: ${urls.slice(before).join(', ')}`);
});

// A page served from A, a link DECLARED toward B: where the page is served from is not a transport of the link.
async function withLocation<T>(loc: { origin: string; href: string; hostname: string; host: string; protocol: string } | null, fn: () => Promise<T>): Promise<T> {
  const g = globalThis as any;
  const had = Object.prototype.hasOwnProperty.call(g, 'location'); const prev = g.location;
  if (loc) g.location = loc;
  try { return await fn(); } finally { if (had) g.location = prev; else delete g.location; }
}
const PAGE_A = { origin: 'https://a.example', href: 'https://a.example/app', hostname: 'a.example', host: 'a.example', protocol: 'https:' };

await contract('L1 a page served from A with an explicit link to B: when B fails, A receives no proof', async () => {
  await withLocation(PAGE_A, async () => {
    const r = await contactsWithOptions('https://b.example', 'ana.b.example', {}, (u) => u.startsWith('https://b.example/'));
    const proofs = r.explicit.filter((c) => c.signedProof).map((c) => new URL(c.url).origin);
    assert.ok(r.error, 'it fails');
    assert.ok(!proofs.includes('https://a.example'), `the page's origin received a proof: ${proofs.join(', ')}`);
    assert.deepEqual(proofs, ['https://b.example']);
  });
});

await contract('L2 a page location alone does not authorize a destination: nothing declared -> refused, A sent nothing', async () => {
  await withLocation(PAGE_A, async () => {
    const kernel: any = () => undefined;
    kernel[ME_EXPRESSION_SYMBOL] = 'ana.a.example'; kernel.learn = () => undefined;
    kernel['!'] = { prove: async ({ rootNamespace, challenge }: any) => ({ identityHash: 'h', expression: 'ana', namespace: `ana.${rootNamespace}`, rootNamespace, challenge: challenge ?? null, publicKey: 'p', message: 'm', signature: 'SIG', timestamp: 1 }) };
    const urls: string[] = [];
    const fetcher: any = async (u: any) => { urls.push(String(u)); return new Response('{}', { status: 200 }); };
    const node = cleaker(kernel, { fetcher } as any);
    await new Promise((r) => setTimeout(r, 30));
    const before = urls.length;
    let error = '';
    try { await node.signIn({ namespace: 'ana.a.example' }); } catch (e: any) { error = String(e?.message || e); }
    assert.equal(error, 'TRANSPORT_NOT_DECLARED');
    assert.equal(urls.length - before, 0);
  });
});

await contract('L3 the environment\'s defaults alone do not authorize one either', async () => {
  const had = process.env.CLEAKER_NAMESPACE_ROOT; process.env.CLEAKER_NAMESPACE_ROOT = 'env.example';
  try {
    const kernel: any = () => undefined;
    kernel[ME_EXPRESSION_SYMBOL] = 'ana.env.example'; kernel.learn = () => undefined;
    kernel['!'] = { prove: async ({ rootNamespace, challenge }: any) => ({ identityHash: 'h', expression: 'ana', namespace: `ana.${rootNamespace}`, rootNamespace, challenge: challenge ?? null, publicKey: 'p', message: 'm', signature: 'SIG', timestamp: 1 }) };
    const urls: string[] = [];
    const fetcher: any = async (u: any) => { urls.push(String(u)); return new Response('{}', { status: 200 }); };
    const node = cleaker(kernel, { fetcher } as any);
    await new Promise((r) => setTimeout(r, 30));
    const before = urls.length;
    let error = '';
    try { await node.signIn({ namespace: 'ana.env.example' }); } catch (e: any) { error = String(e?.message || e); }
    assert.equal(error, 'TRANSPORT_NOT_DECLARED');
    assert.equal(urls.length - before, 0);
  } finally { if (had === undefined) delete process.env.CLEAKER_NAMESPACE_ROOT; else process.env.CLEAKER_NAMESPACE_ROOT = had; }
});

await contract('L4 discovery and authorization are separate: a source receives a proof only if the caller listed it', async () => {
  // nothing listed: discovery has candidates (the page's location), none is authorized
  await withLocation(PAGE_A, async () => {
    const none = await contactsWithOptions('https://b.example', 'ana.b.example', {}, (u) => u.startsWith('https://b.example/'));
    assert.ok(!none.explicit.some((c) => c.url.startsWith('https://a.example/')), 'the discovered page origin was not authorized');
    // the caller lists 'location': now, and only now, the page's origin may receive the proof after the declared one fails
    const listed = await contactsWithOptions('https://b.example', 'ana.b.example', { authorizeDiscovered: ['location'] }, (u) => u.startsWith('https://b.example/'));
    const hosts = listed.explicit.filter((c) => c.signedProof).map((c) => new URL(c.url).origin);
    assert.deepEqual(hosts, ['https://b.example', 'https://a.example']);
  });
});

await contract('L5 authorizing one source does not authorize the others', async () => {
  await withLocation(PAGE_A, async () => {
    const r = await contactsWithOptions('https://b.example', 'ana.b.example', { authorizeDiscovered: ['defaults'] }, (u) => !u.startsWith('https://cleaker.me/') && !/^http:\/\/localhost/.test(u));
    const hosts = r.explicit.filter((c) => c.signedProof).map((c) => new URL(c.url).origin);
    assert.ok(!hosts.includes('https://a.example'), 'location was not listed');
    assert.ok(hosts.includes('https://cleaker.me'), 'defaults were listed');
  });
});

await contract('L6 with nothing declared, a listed source is the destination; an unlisted one is refused', async () => {
  const kernelFor = () => {
    const kernel: any = () => undefined;
    kernel[ME_EXPRESSION_SYMBOL] = 'ana.name.space'; kernel.learn = () => undefined;
    kernel['!'] = { prove: async ({ rootNamespace, challenge }: any) => ({ identityHash: 'h', expression: 'ana', namespace: `ana.${rootNamespace}`, rootNamespace, challenge: challenge ?? null, publicKey: 'p', message: 'm', signature: 'SIG', timestamp: 1 }) };
    return kernel;
  };
  const urls: string[] = [];
  const fetcher: any = async (u: any) => { urls.push(String(u)); return new Response(JSON.stringify({ ok: true, namespace: 'ana.name.space', identityHash: 'h', memories: [], openedAt: 1 }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const unlisted = cleaker(kernelFor(), { fetcher } as any);
  await new Promise((r) => setTimeout(r, 30));
  const b0 = urls.length; let e1 = '';
  try { await unlisted.signIn({ namespace: 'ana.name.space' }); } catch (e: any) { e1 = String(e?.message || e); }
  assert.equal(e1, 'TRANSPORT_NOT_DECLARED'); assert.equal(urls.length - b0, 0);
  const listed = cleaker(kernelFor(), { fetcher, authorizeDiscovered: ['namespace'] } as any);
  await new Promise((r) => setTimeout(r, 30));
  const b1 = urls.length;
  await listed.signIn({ namespace: 'ana.name.space' });
  assert.ok(urls.slice(b1).some((u) => u.startsWith('https://name.space/claims/signIn')), urls.slice(b1).join(', '));
});

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} (failures are the places the port still contaminates the namespace)`);
process.exit(failed ? 1 : 0);
