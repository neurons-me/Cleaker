import assert from 'node:assert/strict';
import cleaker from '../../dist/cleaker.es.js';

assert.equal(typeof cleaker, 'function');
assert.equal(cleaker('ana.cleaker:read/profile').__ptr.kind, 'remote');

console.log('ESM build test passed.');
