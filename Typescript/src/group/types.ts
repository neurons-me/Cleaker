/**
 * The shared shape for an anchored shared space ("group"): a stable
 * namespace (P) with a mutable membership set (A) inside it. Mirrors the
 * shape netget's own GatewayClaimsManager already proves in production
 * (modules/netget/Typescript/src/modules/NetGetX/Auth/GatewayClaimsManager.ts)
 * rather than inventing a new one — this module is the shared read-side
 * shape + resolution rules only. Scope vocabulary and mutation/storage
 * mechanics stay with each consumer.
 */
export interface GroupRecord {
  namespace: string;
  owner: string | null;
  admins: Record<string, true>;
  /** identityHash -> scopes; presence of an entry (even []) means registered. */
  grants: Record<string, string[]>;
}

export type GroupRole = 'owner' | 'admin' | 'member' | 'none';
