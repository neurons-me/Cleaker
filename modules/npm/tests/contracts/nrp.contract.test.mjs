import assert from 'node:assert/strict';
import cleaker from '../../dist/cleaker.es.js';

const remote = cleaker('ana.cleaker:read/profile');
assert.equal(remote.__ptr.identity.constant, 'cleaker');
assert.equal(remote.__ptr.intent.selector, 'read');
assert.equal(remote.__ptr.intent.path, 'profile');
assert.equal(remote.__ptr.resolution.namespaceRecordVerified, false);

console.log('NRP contract test passed.');
