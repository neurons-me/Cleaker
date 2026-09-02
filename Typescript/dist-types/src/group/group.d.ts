import type { GroupRecord, GroupRole } from './types.js';
export declare function isOwner(group: GroupRecord, identityHash: string): boolean;
/**
 * The gateway owner is always an admin, mirroring
 * GatewayClaimsManager.isAdmin's own documented behavior.
 */
export declare function isAdmin(group: GroupRecord, identityHash: string): boolean;
/** Owner, admin, or a registered grants entry (even an empty one) counts as membership. */
export declare function isMember(group: GroupRecord, identityHash: string): boolean;
export declare function roleOf(group: GroupRecord, identityHash: string): GroupRole;
/**
 * Pure grants-map lookup. No implicit owner/admin bypass -- mirrors
 * GatewayClaimsManager.hasScope exactly: "admin status alone does not imply
 * the capability, only an explicit grant does."
 */
export declare function hasScope(group: GroupRecord, identityHash: string, scope: string): boolean;
/** True when the group doesn't exist yet, or exists with no owner claimed. */
export declare function canBootstrap(group: GroupRecord | null): boolean;
//# sourceMappingURL=group.d.ts.map