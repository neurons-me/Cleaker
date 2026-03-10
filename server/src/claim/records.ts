import crypto from "crypto";
import { db } from "../Blockchain/db";
import { decryptNoise, deriveIdentityHash, deriveUnlockKey, encryptNoise } from "./derive";
import type {
  ClaimNamespaceResult,
  ClaimRecord,
  NamespaceClaimInput,
  NamespaceOpenInput,
  OpenNamespaceResult,
} from "./types";

function normalizeNamespace(raw: string) {
  return String(raw || "").trim().toLowerCase();
}

export function getClaim(namespace: string): ClaimRecord | undefined {
  const ns = normalizeNamespace(namespace);
  if (!ns) return undefined;
  return db
    .prepare(
      `
      SELECT namespace, identityHash, encryptedNoise, publicKey, createdAt, updatedAt
      FROM claims
      WHERE namespace = ?
    `
    )
    .get(ns) as ClaimRecord | undefined;
}

export function claimNamespace(input: NamespaceClaimInput): ClaimNamespaceResult {
  const namespace = normalizeNamespace(input.namespace);
  const secret = String(input.secret || "");
  const publicKey = String(input.publicKey || "").trim() || null;

  if (!namespace) return { ok: false, error: "NAMESPACE_REQUIRED" };
  if (!secret) return { ok: false, error: "SECRET_REQUIRED" };

  const exists = getClaim(namespace);
  if (exists) return { ok: false, error: "NAMESPACE_TAKEN" };

  const noise = crypto.randomBytes(32).toString("hex");
  const identityHash = deriveIdentityHash(namespace, secret);
  const unlockKey = deriveUnlockKey(namespace, secret);
  const encryptedNoise = encryptNoise(noise, unlockKey);
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO claims (namespace, identityHash, encryptedNoise, publicKey, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(namespace, identityHash, encryptedNoise, publicKey, now, now);

  const record = getClaim(namespace);
  return {
    ok: true,
    noise,
    record:
      record ||
      ({
        namespace,
        identityHash,
        encryptedNoise,
        publicKey,
        createdAt: now,
        updatedAt: now,
      } satisfies ClaimRecord),
  };
}

export function openNamespace(input: NamespaceOpenInput): OpenNamespaceResult {
  const namespace = normalizeNamespace(input.namespace);
  const secret = String(input.secret || "");

  if (!namespace) return { ok: false, error: "NAMESPACE_REQUIRED" };
  if (!secret) return { ok: false, error: "SECRET_REQUIRED" };

  const record = getClaim(namespace);
  if (!record) return { ok: false, error: "CLAIM_NOT_FOUND" };

  const identityHash = deriveIdentityHash(namespace, secret);
  if (identityHash !== record.identityHash) {
    return { ok: false, error: "CLAIM_VERIFICATION_FAILED" };
  }

  try {
    const unlockKey = deriveUnlockKey(namespace, secret);
    const noise = decryptNoise(record.encryptedNoise, unlockKey);
    return { ok: true, record, noise };
  } catch {
    return { ok: false, error: "NOISE_DECRYPT_FAILED" };
  }
}
