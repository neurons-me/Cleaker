import assert from 'node:assert/strict';
import {
  bindingRelation,
  composeRelations,
  createNamespaceRegion,
  existenceRelation,
  identityRelation,
  intersectRegions,
  isRefinement,
  isRefinementOf,
  isSubsetOf,
  namespaceRegionToString,
  parseNamespaceRegion,
  refinesRelation,
} from '../src/algebra';

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('ALG0 - adding coordinates refines the namespace region', () => {
  const root = parseNamespaceRegion('https://cleaker.me/');
  const board = parseNamespaceRegion('https://jabellae.cleaker.me/board');

  assert.equal(isRefinement(board, root), true);
  assert.equal(isRefinementOf(board, root), true);
  assert.equal(isSubsetOf(board, root), true);
});

run('ALG0.1 - jabellae.cleaker.me/board is a subset of jabellae.cleaker.me/', () => {
  const broad = parseNamespaceRegion('https://jabellae.cleaker.me/');
  const narrow = parseNamespaceRegion('https://jabellae.cleaker.me/board');

  assert.equal(isSubsetOf(narrow, broad), true);
  assert.equal(isRefinement(narrow, broad), true);
});

run('ALG1 - /? is a refinement of bare existence', () => {
  const existence = parseNamespaceRegion('https://jabellae.cleaker.me/');
  const bound = parseNamespaceRegion('https://jabellae.cleaker.me/?bind=self');

  assert.equal(isRefinementOf(bound, existence), true);
  assert.equal(namespaceRegionToString(bound), 'jabellae.cleaker.me/?bind=self');
});

run('ALG2 - binding relation resolves viewer ∩ target', () => {
  const viewer = parseNamespaceRegion('https://jabellae.cleaker.me/?bind=self');
  const target = parseNamespaceRegion('https://jabellae.cleaker.me/board');
  const relation = bindingRelation(target);

  assert.deepEqual(relation.apply(viewer), target);
});

run('ALG3 - existence relation is constant and identity relation returns the viewer', () => {
  const viewer = parseNamespaceRegion('https://ana.cleaker.me/');
  const target = parseNamespaceRegion('https://jabellae.cleaker.me/');

  assert.deepEqual(existenceRelation(target).apply(viewer), target);
  assert.deepEqual(identityRelation().apply(viewer), viewer);
});

run('ALG3.1 - cleaker.me/? behaves as relative identity for the host root', () => {
  const viewer = parseNamespaceRegion('https://cleaker.me/?bind=self');
  assert.deepEqual(identityRelation().apply(viewer), viewer);
});

run('ALG4 - relation composition keeps the more specific target', () => {
  const viewer = parseNamespaceRegion('https://cleaker.me/?bind=self');
  const target = parseNamespaceRegion('https://jabellae.cleaker.me/board');
  const relation = composeRelations(existenceRelation(target), identityRelation());

  assert.deepEqual(relation.apply(viewer), target);
});

run('ALG5 - intersectRegions returns the more specific shared region', () => {
  const left = createNamespaceRegion({
    domain: 'cleaker.me',
    subdomain: 'jabellae',
    port: null,
    path: ['board'],
    bind: 'none',
  });
  const right = createNamespaceRegion({
    domain: 'cleaker.me',
    subdomain: 'jabellae',
    port: null,
    path: [],
    bind: 'none',
  });

  assert.deepEqual(intersectRegions(left, right), left);
});

run('ALG6 - relation refinement is checked against a viewer context', () => {
  const viewer = parseNamespaceRegion('https://cleaker.me/');
  const broad = existenceRelation(parseNamespaceRegion('https://jabellae.cleaker.me/'));
  const narrow = existenceRelation(parseNamespaceRegion('https://jabellae.cleaker.me/board'));

  assert.equal(refinesRelation(narrow, broad, viewer), true);
});

console.log('All cleaker algebra tests passed.');
