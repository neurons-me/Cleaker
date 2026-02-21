// www/api/src/Blockchain/blockchain.ts
// -----------------------------------------------------------------------------
// Blockchain Blocks Table (uses the shared SQLite instance from db.ts)
// -----------------------------------------------------------------------------
import { db } from "./db";
// -----------------------------------------------------------------------------
// SCHEMA (only once per host)
// -----------------------------------------------------------------------------
// 1) Create tables (no indexes yet; migrations may add columns on existing DBs)
db.exec(`
CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blockId TEXT NOT NULL UNIQUE,
  timestamp INTEGER NOT NULL,
  namespace TEXT NOT NULL,
  identityHash TEXT NOT NULL,
  expression TEXT NOT NULL,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  identityHash TEXT NOT NULL,
  publicKey TEXT NOT NULL,
  commitment TEXT,
  identityNoise TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
`);

// 2) Lightweight migrations (safe for existing DBs)
function addColumnIfMissing(table: string, col: string, type: string) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  const exists = info.some((r) => r.name === col);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    console.log(`🧬 Migration: added ${table}.${col}`);
  }
}
addColumnIfMissing("users", "commitment", "TEXT");
addColumnIfMissing("users", "identityNoise", "TEXT");
// Backfill NOT NULL expectations for newly added columns on old rows (if any)
db.exec(`
UPDATE users SET commitment = '' WHERE commitment IS NULL;
UPDATE users SET identityNoise = '' WHERE identityNoise IS NULL;
`);

// 3) Create indexes (after columns exist)
db.exec(`
CREATE INDEX IF NOT EXISTS idx_blocks_identity ON blocks(identityHash);
CREATE INDEX IF NOT EXISTS idx_blocks_namespace ON blocks(namespace);
CREATE INDEX IF NOT EXISTS idx_blocks_ts ON blocks(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_identity ON users(identityHash);
CREATE INDEX IF NOT EXISTS idx_users_commitment ON users(commitment);
`);

console.log("📐 Blockchain schema initialized");
// -----------------------------------------------------------------------------
// Insert Block
// -----------------------------------------------------------------------------
const insertStmt = db.prepare(`
  INSERT INTO blocks (blockId, timestamp, namespace, identityHash, expression, json)
  VALUES (@blockId, @timestamp, @namespace, @identityHash, @expression, @json)
`);

export function appendBlock(block: any) {
  insertStmt.run({
    blockId: block.blockId,
    timestamp: block.timestamp,
    namespace: block.namespace,
    identityHash: block.identityHash,
    expression: block.expression,
    json: JSON.stringify(block),
  });
  return { ok: true, blockId: block.blockId };
}

// -----------------------------------------------------------------------------
// Read Blocks
// -----------------------------------------------------------------------------
export function getAllBlocks() {
  return db.prepare("SELECT * FROM blocks ORDER BY id ASC").all();
}

export function getBlocksForIdentity(identityHash: string) {
  return db.prepare(`
    SELECT * FROM blocks WHERE identityHash = ? ORDER BY id ASC
  `).all(identityHash);
}

export function getBlocksForNamespace(namespace: string) {
  return db.prepare(`
    SELECT * FROM blocks WHERE namespace = ? ORDER BY id ASC
  `).all(namespace);
}