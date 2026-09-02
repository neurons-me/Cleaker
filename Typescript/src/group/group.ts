import type { GroupRecord, GroupRole } from './types.js';

export function isOwner(group: GroupRecord, identityHash: string): boolean {
  return group.owner === identityHash;
}

/**
 * The gateway owner is always an admin, mirroring
 * GatewayClaimsManager.isAdmin's own documented behavior.
 */
export function isAdmin(group: GroupRecord, identityHash: string): boolean {
  return isOwner(group, identityHash) || group.admins[identityHash] === true;
}

/** Owner, admin, or a registered grants entry (even an empty one) counts as membership. */
export function isMember(group: GroupRecord, identityHash: string): boolean {
  return isAdmin(group, identityHash) || Object.prototype.hasOwnProperty.call(group.grants, identityHash);
}

export function roleOf(group: GroupRecord, identityHash: string): GroupRole {
  if (isOwner(group, identityHash)) return 'owner';
  if (isAdmin(group, identityHash)) return 'admin';
  if (isMember(group, identityHash)) return 'member';
  return 'none';
}

/**
 * Pure grants-map lookup. No implicit owner/admin bypass -- mirrors
 * GatewayClaimsManager.hasScope exactly: "admin status alone does not imply
 * the capability, only an explicit grant does."
 */
export function hasScope(group: GroupRecord, identityHash: string, scope: string): boolean {
  return (group.grants[identityHash] ?? []).includes(scope);
}

/** True when the group doesn't exist yet, or exists with no owner claimed. */
export function canBootstrap(group: GroupRecord | null): boolean {
  return group === null || group.owner === null;
}
