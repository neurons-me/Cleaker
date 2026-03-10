// www/api/src/Blockchain/db.ts
// -------------------------------------------------------------
// SQLite connection — one semantic ledger per host
// -------------------------------------------------------------
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
// -------------------------------------------------------------
// PATH DEL BLOCKCHAIN (1 por host)
// -------------------------------------------------------------
const BLOCKCHAIN_FILENAME = "blockchain.db";
// Usar CWD por ahora (configurable después)
const DB_PATH = path.join(process.cwd(), BLOCKCHAIN_FILENAME);
// -------------------------------------------------------------
// ASEGURAR QUE EL ARCHIVO EXISTE
// -------------------------------------------------------------
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, "");
}

// -------------------------------------------------------------
// ABRIR CONEXIÓN (SYNC — recomendado para blockchain)
// -------------------------------------------------------------
let db: Database.Database;
try {
  db = new Database(DB_PATH);

  // Basic pragmas for better dev experience.
  // WAL gives better concurrency; foreign_keys is good hygiene.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // -------------------------------------------------------------
  // SCHEMA INIT (idempotent)
  // -------------------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocks (
      blockId TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      namespace TEXT NOT NULL,
      identityHash TEXT,
      expression TEXT,
      json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);
    CREATE INDEX IF NOT EXISTS idx_blocks_identityHash ON blocks(identityHash);

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      identityHash TEXT NOT NULL,
      publicKey TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_identityHash ON users(identityHash);

    CREATE TABLE IF NOT EXISTS faces (
      faceId TEXT PRIMARY KEY,
      identityHash TEXT NOT NULL,
      templateHash TEXT NOT NULL,
      template TEXT NOT NULL,
      algo TEXT NOT NULL,
      dims INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      UNIQUE(templateHash)
    );

    CREATE INDEX IF NOT EXISTS idx_faces_identityHash ON faces(identityHash);
    CREATE INDEX IF NOT EXISTS idx_faces_templateHash ON faces(templateHash);
  `);
} catch (err: any) {
  console.error("❌ SQLite ledger initialization failed:", err.message);
  throw err;
}

// -------------------------------------------------------------
// EXPORTAR INSTANCIA ÚNICA
// -------------------------------------------------------------
export { db, DB_PATH };
