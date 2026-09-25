/**
 * namespace-constant-resolution.test.ts — resolveSurfaceNamespaceConstant()'s
 * kernel-bound-root fallback.
 *
 * WHAT THIS TESTS
 * bindKernel()'s internal resolveNamespace() composes `${expression}.${constant}`
 * (when no explicit namespace is given), where the constant comes from
 * resolveSurfaceNamespaceConstant()'s priority chain: explicit `space` option
 * → browser location host → env var → (new) whatever root a caller already
 * bound onto this exact kernel via ME.bindNamespace(root) → hardcoded default.
 *
 * Deliberately does NOT pass an explicit `namespace` to signIn() — that would
 * short-circuit resolveNamespace() entirely (it returns the explicit value
 * immediately) and never reach the constant-resolution chain this is testing.
 * Asserts on the request BODY's `namespace` field, not the connection URL —
 * the URL comes from a separate resolveSurfaceOrigins() chain (with its own,
 * unrelated os.hostname() fallback) that this change does not touch.
 */

import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import { run } from './test.util.ts';

const ME_EXPRESSION_SYMBOL = Symbol.for('me.expression');

function createMockKernelWithBoundNamespace(expression: string, boundRootNamespace: string | null) {
  const kernel: any = (path?: string) => {
    if (path === 'profile.rootNamespace') return boundRootNamespace;
    return undefined;
  };
  kernel[ME_EXPRESSION_SYMBOL] = expression;
  kernel.learn = () => {};
  // signIn() needs a real proof now -- these tests only care about which
  // namespace ends up in the request body, so a minimal, always-succeeding
  // prove() (echoing the SAME expression this mock is bound to) is enough
  // to reach the (mocked, 404ing) fetcher.
  kernel['!'] = {
    prove: async ({ rootNamespace, challenge }: { rootNamespace: string; challenge?: string | null }) => ({
      identityHash: 'mock-identity',
      expression,
      namespace: `${expression.toLowerCase()}.${rootNamespace}`,
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

function captureRequestNamespaces(): { namespaces: string[]; fetcher: typeof fetch } {
  const namespaces: string[] = [];
  const fetcher = async (_endpoint: URL | RequestInfo, init?: RequestInit) => {
    try {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (typeof body?.namespace === 'string') namespaces.push(body.namespace);
    } catch {
      // Non-JSON or missing body (e.g. the __bootstrap ping) — nothing to capture.
    }
    return new Response(JSON.stringify({ ok: false, error: 'CLAIM_NOT_FOUND' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { namespaces, fetcher: fetcher as typeof fetch };
}

void run('Namespace constant: falls back to kernel-bound root when nothing else resolves', async () => {
  const { namespaces, fetcher } = captureRequestNamespaces();
  const me = createMockKernelWithBoundNamespace('jabellae', 'local.cleaker');
  // No `space` argument, no explicit namespace passed to signIn() below, no
  // browser `location` (Node test env), no env vars set — every
  // higher-priority source is absent, so this should reach the new
  // kernel-bound-root fallback and compose "jabellae.local.cleaker".
  const node = cleaker(me, { fetcher });
  try { await node.signIn({} as any); } catch { /* expected: mock 404s */ }
  assert.ok(
    namespaces.some(ns => ns === 'jabellae.local.cleaker'),
    `Expected a request with namespace "jabellae.local.cleaker", got: ${JSON.stringify(namespaces)}`,
  );
});

void run('Namespace constant: explicit space still wins over kernel-bound root', async () => {
  const { namespaces, fetcher } = captureRequestNamespaces();
  const me = createMockKernelWithBoundNamespace('jabellae', 'local.cleaker');
  const node = cleaker(me, 'cleaker.me', { fetcher });
  try { await node.signIn({} as any); } catch { /* expected: mock 404s */ }
  assert.ok(
    namespaces.some(ns => ns === 'jabellae.cleaker.me'),
    `Expected explicit space to produce "jabellae.cleaker.me", got: ${JSON.stringify(namespaces)}`,
  );
  assert.ok(
    !namespaces.some(ns => ns.includes('local.cleaker')),
    `Kernel-bound root should not have been used, got: ${JSON.stringify(namespaces)}`,
  );
});

void run('Namespace constant: no kernel-bound root, nothing else resolves → hardcoded default', async () => {
  const { namespaces, fetcher } = captureRequestNamespaces();
  const me = createMockKernelWithBoundNamespace('anon', null); // never bound to a namespace
  const node = cleaker(me, { fetcher });
  try { await node.signIn({} as any); } catch { /* expected: mock 404s */ }
  assert.ok(
    namespaces.length > 0 && !namespaces.some(ns => ns.includes('local.cleaker')),
    `Expected a namespace using the hardcoded default (not local.cleaker), got: ${JSON.stringify(namespaces)}`,
  );
});
