// www/api/src/Blockchain/faces.ts
// -------------------------------------------------------------
// Faces Table Accessors (using shared SQLite db)
// -------------------------------------------------------------
// NOTE:
//  - This file only provides DB accessors.
//  - Do NOT store raw images. Store a compact face template/embedding and a hash.
//  - Keep the template format/version explicit so you can migrate later.
import { db } from "./db";
export type FaceRow = {
  faceId: string;
  identityHash: string;
  templateHash: string;
  template: string; // serialized embedding/template (e.g. base64/hex/JSON string)
  algo: string; // e.g. 'face-api.js@x.y.z' or 'mediapipe@x.y.z'
  dims: number; // embedding dimension (e.g. 128, 512)
  createdAt: number;
  updatedAt: number;
};
// -------------------------------------------------------------
// GET ALL FACES
// -------------------------------------------------------------
export function getAllFaces() {
  return db
    .prepare(
      `
      SELECT faceId, identityHash, templateHash, template, algo, dims, createdAt, updatedAt
      FROM faces
      ORDER BY createdAt ASC
    `
    )
    .all();
}

// -------------------------------------------------------------
// GET SINGLE FACE BY faceId
// -------------------------------------------------------------
export function getFace(faceId: string) {
  return db
    .prepare(
      `
      SELECT faceId, identityHash, templateHash, template, algo, dims, createdAt, updatedAt
      FROM faces
      WHERE faceId = ?
    `
    )
    .get(String(faceId || "").trim());
}

// -------------------------------------------------------------
// GET FACES FOR IDENTITY
// -------------------------------------------------------------
export function getFacesForIdentity(identityHash: string) {
  return db
    .prepare(
      `
      SELECT faceId, identityHash, templateHash, template, algo, dims, createdAt, updatedAt
      FROM faces
      WHERE identityHash = ?
      ORDER BY createdAt ASC
    `
    )
    .all(String(identityHash || "").trim());
}

// -------------------------------------------------------------
// FIND IDENTITY BY TEMPLATE HASH
// -------------------------------------------------------------
export function findIdentityByTemplateHash(templateHash: string) {
  const row = db
    .prepare(
      `
      SELECT identityHash
      FROM faces
      WHERE templateHash = ?
      LIMIT 1
    `
    )
    .get(String(templateHash || "").trim()) as { identityHash: string } | undefined;
  return row?.identityHash ?? null;
}

// -------------------------------------------------------------
// CLAIM / REGISTER FACE TEMPLATE
// Enforces: 1 templateHash -> 1 identityHash (no duplicates across identities)
// Also supports: updating/replacing template for the SAME identityHash if faceId exists.
// -------------------------------------------------------------
export function claimFace(
  args: {
    faceId: string;
    identityHash: string;
    templateHash: string;
    template: string;
    algo: string;
    dims: number;
  }
) {
  const faceId = String(args.faceId || "").trim();
  const identityHash = String(args.identityHash || "").trim();
  const templateHash = String(args.templateHash || "").trim();
  const template = String(args.template || "");
  const algo = String(args.algo || "").trim();
  const dims = Number(args.dims || 0);
  if (!faceId) return { ok: false as const, error: "FACE_ID_REQUIRED" };
  if (!identityHash) return { ok: false as const, error: "IDENTITY_HASH_REQUIRED" };
  if (!templateHash) return { ok: false as const, error: "TEMPLATE_HASH_REQUIRED" };
  if (!template) return { ok: false as const, error: "TEMPLATE_REQUIRED" };
  if (!algo) return { ok: false as const, error: "ALGO_REQUIRED" };
  if (!Number.isFinite(dims) || dims <= 0) return { ok: false as const, error: "DIMS_REQUIRED" };
  // If this templateHash is already registered to some identity, only allow if it matches.
  const existing = db
    .prepare(
      `SELECT faceId, identityHash FROM faces WHERE templateHash = ? LIMIT 1`
    )
    .get(templateHash) as { faceId: string; identityHash: string } | undefined;
  if (existing && existing.identityHash !== identityHash) {
    return { ok: false as const, error: "FACE_ALREADY_CLAIMED" };
  }

  const now = Date.now();
  // Upsert by faceId for the same identity.
  const byFaceId = db
    .prepare(`SELECT faceId, identityHash FROM faces WHERE faceId = ? LIMIT 1`)
    .get(faceId) as { faceId: string; identityHash: string } | undefined;
  if (byFaceId) {
    if (byFaceId.identityHash !== identityHash) {
      return { ok: false as const, error: "FACE_ID_OWNED_BY_OTHER_IDENTITY" };
    }

    db.prepare(
      `
      UPDATE faces
      SET templateHash = ?, template = ?, algo = ?, dims = ?, updatedAt = ?
      WHERE faceId = ?
    `
    ).run(templateHash, template, algo, dims, now, faceId);
    return { ok: true as const, mode: "updated" as const, faceId };
  }

  db.prepare(
    `
    INSERT INTO faces (faceId, identityHash, templateHash, template, algo, dims, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(faceId, identityHash, templateHash, template, algo, dims, now, now);
  return { ok: true as const, mode: "created" as const, faceId };
}

// -------------------------------------------------------------
// DELETE FACE TEMPLATE (optional admin/local action)
// -------------------------------------------------------------
export function deleteFace(faceId: string) {
  const id = String(faceId || "").trim();
  if (!id) return { ok: false as const, error: "FACE_ID_REQUIRED" };
  const exists = db
    .prepare(`SELECT faceId FROM faces WHERE faceId = ? LIMIT 1`)
    .get(id);
  if (!exists) return { ok: false as const, error: "FACE_NOT_FOUND" };
  db.prepare(`DELETE FROM faces WHERE faceId = ?`).run(id);
  return { ok: true as const };
}

// -------------------------------------------------------------
// Compatibility exports (older server code)
// -------------------------------------------------------------
export function upsertFaceTemplate(args: {
  faceId: string;
  identityHash: string;
  templateHash: string;
  template: string;
  algo: string;
  dims: number;
}) {
  return claimFace(args);
}

export function getFaceTemplate(identityHash: string) {
  const rows = getFacesForIdentity(String(identityHash || '').trim()) as any[];
  return rows?.[0] ?? null;
}
