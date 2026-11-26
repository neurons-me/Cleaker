import assert from 'node:assert/strict';
import cleaker from '../index.ts';
import { positionOf, surfaceOf } from '../src/position/position.ts';
import { run } from './test.util.ts';

// Where you are: `namespace @ surface`, the surface being the EXACT place (host + path + query + fragment).

const page = (href: string) => {
  const u = new URL(href);
  return { protocol: u.protocol, host: u.host, pathname: u.pathname, search: u.search, hash: u.hash };
};

void run('Surface: a site root is the host alone', async () => {
  assert.equal(surfaceOf(page('https://cleaker.me/'))?.compact, 'cleaker.me');
});

void run('Surface: the path is part of the place', async () => {
  assert.equal(positionOf('cleaker.me', page('https://neurons-me.github.io/Cleaker/')).expression, 'cleaker.me @ neurons-me.github.io/Cleaker');
});

void run('Surface: query and fragment are kept (a section of a page is a place)', async () => {
  const p = positionOf('ana.cleaker.me', page('https://es.wikipedia.org/wiki/Pastor_alem%C3%A1n?oldid=1#Historia'));
  assert.equal(p.surface, 'es.wikipedia.org/wiki/Pastor_alem%C3%A1n?oldid=1#Historia');
  assert.equal(p.full, 'ana.cleaker.me @ "https://es.wikipedia.org/wiki/Pastor_alem%C3%A1n?oldid=1#Historia"');
});

void run('Surface: trailing slash and index.html are the same document', async () => {
  assert.equal(surfaceOf(page('https://x.org/docs/index.html'))?.compact, 'x.org/docs');
  assert.equal(surfaceOf(page('https://x.org/docs/'))?.compact, 'x.org/docs');
});

void run('Surface: http on a public host is quoted with its scheme', async () => {
  assert.equal(surfaceOf(page('http://cleaker.me/x'))?.compact, '"http://cleaker.me/x"');
});

void run('Surface: http on loopback is bare, port kept', async () => {
  assert.equal(surfaceOf(page('http://localhost:5173/users'))?.compact, 'localhost:5173/users');
});

void run('Surface: forceScheme quotes even the usual scheme', async () => {
  assert.equal(surfaceOf(page('https://cleaker.me/'), { forceScheme: true })?.compact, '"https://cleaker.me"');
});

void run('Surface: a file is its name compact, the full path when exact', async () => {
  const s = surfaceOf({ protocol: 'file:', host: '', pathname: '/Users/me/page.html' });
  assert.deepEqual(s, { compact: 'page.html', full: '"file:///Users/me/page.html"' });
});

void run('Position: no page → just the namespace', async () => {
  assert.deepEqual(positionOf('cleaker.me', null), { namespace: 'cleaker.me', surface: '', expression: 'cleaker.me', full: 'cleaker.me' });
});

void run('Position: node.position() reads the current page every call', async () => {
  const kernel: any = () => undefined;
  kernel[Symbol.for('me.expression')] = null;
  kernel.learn = () => {};
  const node = cleaker(kernel, 'cleaker.me');
  const g = globalThis as { location?: unknown };
  const had = 'location' in g, prev = g.location;
  try {
    assert.equal(node.position().expression, 'cleaker.me'); // Node: no page
    g.location = page('https://neurons-me.github.io/Cleaker/#notes');
    assert.equal(node.position().expression, 'cleaker.me @ neurons-me.github.io/Cleaker#notes');
    g.location = page('https://neurons-me.github.io/Cleaker/algebra.html');
    assert.equal(node.position().expression, 'cleaker.me @ neurons-me.github.io/Cleaker/algebra.html');
  } finally {
    if (had) g.location = prev; else delete g.location;
  }
});
