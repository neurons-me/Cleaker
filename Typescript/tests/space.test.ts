import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import { run } from './test.util.ts';

const ME_EXPRESSION_SYMBOL = Symbol.for('me.expression');

function createMockKernel(expression: string | null = null) {
  const kernel: any = (path?: string) => undefined;
  kernel[ME_EXPRESSION_SYMBOL] = expression;
  kernel.learn = () => {};
  // signIn()/claim() need a real proof now -- these tests only care about
  // which origin URL gets hit, so a minimal, always-succeeding prove() is
  // enough to get past that step and reach the (mocked, 404ing) fetcher.
  kernel['!'] = {
    prove: async ({ rootNamespace, challenge }: { rootNamespace: string; challenge?: string | null }) => ({
      identityHash: 'mock-identity',
      expression: String(expression || ''),
      namespace: `${String(expression || '').toLowerCase()}.${rootNamespace}`,
      rootNamespace,
      challenge: challenge ?? null,
      publicKey: 'mock-pubkey',
      message: 'mock-message',
      signature: 'mock-signature',
      timestamp: Date.now(),
    }),
  };
  return kernel;
}

function captureUrls(): { urls: string[]; fetcher: typeof fetch } {
  const urls: string[] = [];
  const fetcher = async (endpoint: URL | RequestInfo) => {
    urls.push(String(endpoint));
    return new Response(JSON.stringify({ ok: false, error: 'CLAIM_NOT_FOUND' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { urls, fetcher: fetcher as typeof fetch };
}

// --- Space → Origin resolution ---

void run('Space: public domain → https with no port', async () => {
  const { urls, fetcher } = captureUrls();
  const me = createMockKernel('suiGn');
  const node = cleaker(me, 'neurons.me', { fetcher });
  try { await node.signIn({ namespace: 'suiGn.neurons.me' }); } catch {}
  assert.ok(urls.some(u => u.startsWith('https://neurons.me')), `Expected https://neurons.me, got: ${urls[0]}`);
});

void run('Space: bare hostname (no dot) → http + .local + port 8161', async () => {
  const { urls, fetcher } = captureUrls();
  const me = createMockKernel('suiGn');
  const node = cleaker(me, 'sui-desk', { fetcher });
  try { await node.signIn({ namespace: 'suiGn.sui-desk.local' }); } catch {}
  assert.ok(urls.some(u => u.startsWith('http://sui-desk.local:8161')), `Expected http://sui-desk.local:8161, got: ${urls[0]}`);
});

void run('Space: bare hostname with custom port → http + .local + that port', async () => {
  const { urls, fetcher } = captureUrls();
  const me = createMockKernel('suiGn');
  const node = cleaker(me, 'sui-desk:9000', { fetcher });
  try { await node.signIn({ namespace: 'suiGn.sui-desk.local' }); } catch {}
  assert.ok(urls.some(u => u.startsWith('http://sui-desk.local:9000')), `Expected http://sui-desk.local:9000, got: ${urls[0]}`);
});

void run('Space: IP address → http + port 8161', async () => {
  const { urls, fetcher } = captureUrls();
  const me = createMockKernel('suiGn');
  const node = cleaker(me, '192.168.1.5', { fetcher });
  try { await node.signIn({ namespace: 'suiGn.192.168.1.5' }); } catch {}
  assert.ok(urls.some(u => u.startsWith('http://192.168.1.5:8161')), `Expected http://192.168.1.5:8161, got: ${urls[0]}`);
});

void run('Space: IP address with explicit port → http + that port', async () => {
  const { urls, fetcher } = captureUrls();
  const me = createMockKernel('suiGn');
  const node = cleaker(me, '192.168.1.5:8181', { fetcher });
  try { await node.signIn({ namespace: 'suiGn.192.168.1.5' }); } catch {}
  assert.ok(urls.some(u => u.startsWith('http://192.168.1.5:8181')), `Expected http://192.168.1.5:8181, got: ${urls[0]}`);
});

// --- Space → Namespace derivation ---

void run('Namespace: expression + public domain → fqdn', async () => {
  const me = createMockKernel('suiGn');
  const node = cleaker(me, 'neurons.me');
  const status = node.getStatus();
  assert.equal(status.activeNamespace, 'suign.neurons.me');
});

void run('Namespace: expression + bare hostname → expression.hostname.local', async () => {
  const me = createMockKernel('suiGn');
  const node = cleaker(me, 'sui-desk');
  const status = node.getStatus();
  assert.equal(status.activeNamespace, 'suign.sui-desk.local');
});

void run('Namespace: expression + hostname with port → strips port from namespace', async () => {
  const me = createMockKernel('suiGn');
  const node = cleaker(me, 'sui-desk:9000');
  const status = node.getStatus();
  assert.equal(status.activeNamespace, 'suign.sui-desk.local');
});

// --- Form 2: fqdn already in kernel expression ---

void run('Form 2: fqdn in expression, cleaker(me) reads it', async () => {
  const me = createMockKernel('suiGn.neurons.me');
  const node = cleaker(me);
  const status = node.getStatus();
  assert.equal(status.activeNamespace, 'suign.neurons.me');
});

// --- signIn hits /claims/signIn first ---

void run('signIn: primary endpoint is /claims/signIn', async () => {
  const { urls, fetcher } = captureUrls();
  const me = createMockKernel('suiGn');
  const node = cleaker(me, 'neurons.me', { fetcher });
  try { await node.signIn({ namespace: 'suiGn.neurons.me' }); } catch {}
  assert.ok(
    urls.some(u => u.includes('/claims/signIn')),
    `Expected /claims/signIn in URLs, got: ${JSON.stringify(urls)}`,
  );
});
