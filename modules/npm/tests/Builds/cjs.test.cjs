const assert = require('node:assert/strict');
const mod = require('../../dist/cleaker.cjs');

assert.equal(typeof mod.default, 'function');
assert.equal(mod.default('ana.cleaker:read/profile').__ptr.kind, 'remote');

console.log('CJS build test passed.');
