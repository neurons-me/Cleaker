/**
 * namespace-fallback.test.ts — Surface fallback and failure notification
 *
 * WHAT IS NAMESPACE FALLBACK?
 * When cleaker tries to resolve a namespace (e.g. suign.cleaker.me) and the
 * primary remote surface fails, it automatically tries the next surface in the
 * priority list (typically localhost). When this transition happens, the node
 * emits 'namespace:fallback' so callers can log or react to the degraded path.
 *
 * When ALL surfaces fail, the node emits 'namespace:failed' with a structured
 * summary of every origin that was tried and the reason each one failed.
 *
 * WHAT WE TEST:
 * 1. 'namespace:fallback' emitted when a remote surface fails and local is next
 * 2. 'namespace:failed' emitted with full tried list when everything fails
 * 3. explain string is human-readable and includes all origins + reasons
 * 4. No events emitted when primary resolves successfully (happy path)
 */

import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import type { NamespaceFallbackPayload, NamespaceFailedPayload } from '../index.ts';
import { run } from './test.util.ts';

const ME_EXPRESSION_SYMBOL = Symbol.for('me.expression');

function createMockKernel(expression: string) {
  const kernel: any = () => undefined;
  kernel[ME_EXPRESSION_SYMBOL] = expression;
  kernel.learn = () => undefined;
  kernel.noise = '';
  return kernel;
}

type Fetcher = typeof fetch;

// Returns a mock fetcher where only allowedOrigins succeed (__bootstrap ping).
// All other origins respond with network-style failure (rejected promise).
function mockFetcher(
  allowedOrigins: string[],
  signInResult?: Record<string, unknown>,
): Fetcher {
  return async (endpoint: URL | RequestInfo) => {
    const url = String(endpoint);
    const isBootstrap = url.endsWith('/__bootstrap');
    const isSignIn = url.includes('/claims/signIn');
    const origin = new URL(url).origin;

    if (isBootstrap) {
      if (allowedOrigins.includes(origin)) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      // Simulate unreachable surface via rejected promise.
      throw new Error('ECONNREFUSED');
    }

    if (isSignIn && allowedOrigins.includes(origin)) {
      return new Response(
        JSON.stringify({ ok: true, ...signInResult }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  };
}

void run("namespace:fallback emitted when remote surface fails and local is next", async () => {
  const me = createMockKernel('suign');
  const fallbacks: NamespaceFallbackPayload[] = [];

  const node = cleaker(me, 'cleaker.me', {
    fetcher: mockFetcher(
      ['http://localhost'],  // only localhost reachable
      { namespace: 'suign.cleaker.me', identityHash: 'abc', noise: '', memories: [], openedAt: Date.now() },
    ),
  });

  node.on('namespace:fallback', (payload) => fallbacks.push(payload));

  await node.validateHosts({ namespace: 'suign.cleaker.me', secret: 'test-secret' });

  assert.ok(fallbacks.length >= 1, 'expected at least one namespace:fallback event');
  const first = fallbacks[0];
  assert.ok(first.failedOrigin.includes('cleaker.me'), `failedOrigin should be cleaker.me, got ${first.failedOrigin}`);
  assert.equal(first.failedReason, 'NETWORK_ERROR');
  const isLocalFallback = first.fallbackOrigin.includes('localhost') || first.fallbackOrigin.includes('.local') || /^https?:\/\/(127\.|10\.|192\.168\.)/.test(first.fallbackOrigin);
  assert.ok(isLocalFallback, `fallbackOrigin should be a local surface, got ${first.fallbackOrigin}`);
  assert.equal(first.namespace, 'suign.cleaker.me');
});

void run("namespace:failed emitted with full explain when all surfaces fail", async () => {
  const me = createMockKernel('suign');
  const failures: NamespaceFailedPayload[] = [];

  const node = cleaker(me, 'cleaker.me', {
    fetcher: mockFetcher([]),  // nothing reachable
  });

  node.on('namespace:failed', (payload) => failures.push(payload));

  await node.validateHosts({ namespace: 'suign.cleaker.me', secret: 'test-secret' });

  assert.ok(failures.length >= 1, 'expected namespace:failed event');
  const f = failures[0];
  assert.equal(f.namespace, 'suign.cleaker.me');
  assert.ok(f.tried.length >= 1, 'tried should list at least one origin');
  assert.ok(typeof f.explain === 'string' && f.explain.length > 0, 'explain should be a non-empty string');
  assert.ok(f.explain.includes('suign.cleaker.me'), 'explain should mention the namespace');
  assert.ok(f.explain.includes('NETWORK_ERROR'), 'explain should include the failure reason');
  assert.ok(f.tried.every(t => t.origin && t.reason), 'each tried entry should have origin and reason');
});

void run("no namespace:failed emitted when primary surface resolves successfully", async () => {
  const me = createMockKernel('suign');
  const failures: NamespaceFailedPayload[] = [];

  const node = cleaker(me, 'neurons.me', {
    fetcher: mockFetcher(
      ['https://neurons.me'],
      { namespace: 'suign.neurons.me', identityHash: 'xyz', noise: '', memories: [], openedAt: Date.now() },
    ),
  });

  node.on('namespace:failed', (payload) => failures.push(payload));

  await node.validateHosts({ namespace: 'suign.neurons.me', secret: 'test-secret' });

  assert.equal(failures.length, 0, 'namespace:failed should not fire on success');
});
