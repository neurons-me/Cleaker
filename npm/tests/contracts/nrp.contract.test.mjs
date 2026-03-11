import assert from 'node:assert/strict';
import cleaker from '../../dist/cleaker.es.js';

const remote = cleaker('me://ana.cleaker:read/profile');
assert.equal(remote.__ptr.identity.constant, 'cleaker');
assert.equal(remote.__ptr.intent.selector, 'read');
assert.equal(remote.__ptr.intent.path, 'profile');
assert.equal(remote.__ptr.resolution.namespaceRecordVerified, false);
assert.equal(remote.__ptr.target.scheme, 'me');
assert.equal(remote.__ptr.target.raw, 'me://ana.cleaker:read/profile');

console.log('NRP contract test passed.');
