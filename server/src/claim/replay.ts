import crypto from "crypto";
import { db } from "../Blockchain/db";

export type ReplayMemory = {
  payload: unknown;
  identityHash: string;
  timestamp: number;
};

type RecordMemoryInput = {
  namespace: string;
  payload: unknown;
  identityHash?: string | null;
  timestamp?: number;
};

type NamespaceWriteAuthInput = {
  claimIdentityHash: string;
  claimPublicKey?: string | null;
  body: unknown;
};

function normalizeNamespace(raw: string) {
  return String(raw || "").trim().toLowerCase();
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function toStableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => toStableJson(item)).join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${toStableJson(obj[key])}`);
  return `{${entries.join(",")}}`;
}

function decodeSignature(rawSignature: string): Buffer | null {
  const sig = String(rawSignature || "").trim();
  if (!sig) return null;

  try {
    return Buffer.from(sig, "base64");
  } catch {
    // Fallback for clients that send hex signatures.
    try {
      return Buffer.from(sig, "hex");
    } catch {
      return null;
    }
  }
}

function stripWriteAuthFields(body: Record<string, unknown>) {
  const {
    signature,
    signedPayload,
    signatureEncoding,
    signatureFormat,
    ...rest
  } = body;
  return rest;
}

function verifySignature(publicKey: string, message: string, signature: Buffer): boolean {
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(message);
    verifier.end();
    return verifier.verify(publicKey, signature);
  } catch {
    return false;
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  namespace TEXT NOT NULL,
  payload TEXT NOT NULL,
  identityHash TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_namespace_ts
ON memories(namespace, timestamp);
`);

export function recordMemory(input: RecordMemoryInput) {
  const namespace = normalizeNamespace(input.namespace);
  if (!namespace) return;

  const timestamp = Number(input.timestamp || Date.now());
  const identityHash = String(input.identityHash || "").trim();
  const payload = JSON.stringify(input.payload ?? null);

  db.prepare(
    `
      INSERT INTO memories (namespace, payload, identityHash, timestamp)
      VALUES (?, ?, ?, ?)
    `
  ).run(namespace, payload, identityHash, timestamp);
}

export function getMemoriesForNamespace(namespace: string): ReplayMemory[] {
  const ns = normalizeNamespace(namespace);
  if (!ns) return [];

  const rows = db
    .prepare(
      `
      SELECT payload, identityHash, timestamp
      FROM memories
      WHERE namespace = ?
      ORDER BY timestamp ASC, id ASC
    `
    )
    .all(ns) as Array<{ payload: string; identityHash: string; timestamp: number }>;

  return rows.map((row) => ({
    payload: safeParseJson(String(row.payload || "")),
    identityHash: String(row.identityHash || ""),
    timestamp: Number(row.timestamp || 0),
  }));
}

export function isNamespaceWriteAuthorized(input: NamespaceWriteAuthInput): boolean {
  const claimIdentityHash = String(input.claimIdentityHash || "").trim();
  if (!claimIdentityHash) return false;

  const body = input.body;
  if (!body || typeof body !== "object") return false;

  const bodyRecord = body as Record<string, unknown>;
  const bodyIdentityHash = String(bodyRecord.identityHash || "").trim();
  if (bodyIdentityHash && bodyIdentityHash === claimIdentityHash) {
    return true;
  }

  const publicKey = String(input.claimPublicKey || "").trim();
  const rawSignature = String(bodyRecord.signature || "").trim();
  if (!publicKey || !rawSignature) {
    return false;
  }

  const signature = decodeSignature(rawSignature);
  if (!signature) return false;

  const signedPayload = String(bodyRecord.signedPayload || "").trim();
  const message = signedPayload || toStableJson(stripWriteAuthFields(bodyRecord));
  return verifySignature(publicKey, message, signature);
}