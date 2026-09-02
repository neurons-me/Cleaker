import assert from 'node:assert/strict';
import {
  canBootstrap,
  hasScope,
  isAdmin,
  isMember,
  isOwner,
  roleOf,
} from '../src/group/group';
import type { GroupRecord } from '../src/group/types';
import { run } from './test.util';

function bookClub(): GroupRecord {
  return {
    namespace: 'book-club',
    owner: 'alice-hash',
    admins: { 'alice-hash': true },
    grants: { 'alice-hash': ['groups:write'], 'bob-hash': [] },
  };
}

run('G0 - owner is owner, admin, and member', () => {
  const group = bookClub();
  assert.equal(isOwner(group, 'alice-hash'), true);
  assert.equal(isAdmin(group, 'alice-hash'), true);
  assert.equal(isMember(group, 'alice-hash'), true);
  assert.equal(roleOf(group, 'alice-hash'), 'owner');
});

run('G1 - registered non-admin is a member but not an admin', () => {
  const group = bookClub();
  assert.equal(isOwner(group, 'bob-hash'), false);
  assert.equal(isAdmin(group, 'bob-hash'), false);
  assert.equal(isMember(group, 'bob-hash'), true);
  assert.equal(roleOf(group, 'bob-hash'), 'member');
});

run('G2 - a stranger with no grants entry is not a member', () => {
  const group = bookClub();
  assert.equal(isMember(group, 'stranger-hash'), false);
  assert.equal(roleOf(group, 'stranger-hash'), 'none');
});

run('G3 - hasScope is a pure grants lookup, admin status does not imply it', () => {
  const group = bookClub();
  assert.equal(hasScope(group, 'alice-hash', 'groups:write'), true);
  assert.equal(hasScope(group, 'alice-hash', 'groups:delete'), false);
  // bob is a member with an explicit empty grant -- no scopes at all.
  assert.equal(hasScope(group, 'bob-hash', 'groups:write'), false);
});

run('G4 - canBootstrap is true only when the group is missing or ownerless', () => {
  assert.equal(canBootstrap(null), true);
  assert.equal(canBootstrap({ namespace: 'new-group', owner: null, admins: {}, grants: {} }), true);
  assert.equal(canBootstrap(bookClub()), false);
});

console.log('All cleaker group tests passed.');
