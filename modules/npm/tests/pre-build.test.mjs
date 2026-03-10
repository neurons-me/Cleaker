import assert from 'node:assert/strict';
import cleaker from '../dist/cleaker.es.js';

const ptr = cleaker('ana.cleaker:read/profile');
assert.equal(ptr.__ptr.transport.preferred[0], 'quic');
assert.equal(ptr.__ptr.intent.path, 'profile');

console.log('Pre-build smoke test passed.');
