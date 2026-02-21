// www/api/src/Blockchain/users.ts
// -------------------------------------------------------------
// Users Table Accessors (using shared SQLite db)
// -------------------------------------------------------------
import { db } from "./db";

export type UserRow = {
  username: string;
  identityHash: string;
  publicKey: string;
  createdAt: number;
  updatedAt: number;
};

export type ClaimUserResult =
  | { ok: true; user: UserRow }
  | { ok: false; error: "USERNAME_TAKEN" | "USERNAME_REQUIRED" | "IDENTITY_HASH_REQUIRED" | "PUBLIC_KEY_REQUIRED" };

function normalizeUsername(raw: string) {
  const u = String(raw || "").trim().toLowerCase();
  return u;
}

// -------------------------------------------------------------
// GET ALL USERS
// -------------------------------------------------------------
export function getAllUsers(): UserRow[] {
  return db
    .prepare(
      `
      SELECT username, identityHash, publicKey, createdAt, updatedAt
      FROM users
      ORDER BY createdAt ASC
    `
    )
    .all() as UserRow[];
}

// -------------------------------------------------------------
// GET SINGLE USER
// -------------------------------------------------------------
export function getUser(username: string): UserRow | undefined {
  const u = normalizeUsername(username);
  if (!u) return undefined;

  return db
    .prepare(
      `
      SELECT username, identityHash, publicKey, createdAt, updatedAt
      FROM users
      WHERE username = ?
    `
    )
    .get(u) as UserRow | undefined;
}

// -------------------------------------------------------------
// CLAIM USERNAME (insert new row)
// -------------------------------------------------------------
export function claimUser(
  username: string,
  identityHash: string,
  publicKey: string
): ClaimUserResult {
  const u = normalizeUsername(username);
  const ih = String(identityHash || "").trim();
  const pk = String(publicKey || "").trim();

  if (!u) return { ok: false, error: "USERNAME_REQUIRED" };
  if (!ih) return { ok: false, error: "IDENTITY_HASH_REQUIRED" };
  if (!pk) return { ok: false, error: "PUBLIC_KEY_REQUIRED" };

  const exists = db.prepare(`SELECT username FROM users WHERE username = ?`).get(u);
  if (exists) {
    return { ok: false, error: "USERNAME_TAKEN" };
  }

  const now = Date.now();
  db.prepare(
    `
    INSERT INTO users (username, identityHash, publicKey, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(u, ih, pk, now, now);

  const user = getUser(u);
  // Should always exist after insert; but keep it safe.
  return {
    ok: true,
    user: (user || { username: u, identityHash: ih, publicKey: pk, createdAt: now, updatedAt: now }) as UserRow,
  };
}

// -------------------------------------------------------------
// COUNT BLOCKS OWNED BY USER
// -------------------------------------------------------------
export function countBlocksForUser(identityHash: string) {
  const ih = String(identityHash || "").trim();
  if (!ih) return 0;

  const row = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM blocks
      WHERE identityHash = ?
    `
    )
    .get(ih) as { count: number } | undefined;

  return row?.count ?? 0;
}