import express from "express";
import crypto from "crypto";
import { claimUser, getUser } from "../Blockchain/users";
import { getFaceTemplate, upsertFaceTemplate } from "../Blockchain/faces";
import { matchFaceTemplate } from "../Blockchain/faceMatch";

export function createLegacyRouter() {
  const router = express.Router();

  // Fetch a single claimed username.
  router.get("/users/:username", (req: express.Request, res: express.Response) => {
    const username = String(req.params.username || "").trim().toLowerCase();
    if (!username) return res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });

    const user = getUser(username);
    if (!user) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });

    return res.json({ ok: true, user });
  });

  // Claim a username on this host's ledger.
  router.post("/users", (req: express.Request, res: express.Response) => {
    const body = req.body ?? {};
    const username = String(body.username || "").trim().toLowerCase();
    const identityHash = String(body.identityHash || "").trim();
    const publicKey = String(body.publicKey || "").trim();

    if (!username) return res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
    if (!identityHash) return res.status(400).json({ ok: false, error: "IDENTITY_HASH_REQUIRED" });
    if (!publicKey) return res.status(400).json({ ok: false, error: "PUBLIC_KEY_REQUIRED" });

    const out = claimUser(username, identityHash, publicKey);
    if (!out.ok) return res.status(409).json(out);

    return res.json({ ok: true, username });
  });

  // Store a face template payload for a username on this ledger.
  router.post("/faces/enroll", (req: express.Request, res: express.Response) => {
    const body = req.body ?? {};
    const username = String(body.username || "").trim().toLowerCase();
    const template = body.template;

    if (!username) return res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
    if (!template || (typeof template !== "object" && !Array.isArray(template))) {
      return res.status(400).json({ ok: false, error: "TEMPLATE_REQUIRED" });
    }

    try {
      const user = getUser(username);
      if (!user) {
        return res.status(200).json({
          ok: true,
          enrolled: false,
          status: "USER_NOT_FOUND",
        });
      }

      const tplVector = Array.isArray(template)
        ? template
        : Array.isArray((template as any)?.template)
          ? (template as any).template
          : null;

      if (
        !tplVector ||
        tplVector.length < 8 ||
        !tplVector.every((n: any) => typeof n === "number" && Number.isFinite(n))
      ) {
        return res.status(400).json({ ok: false, status: "INVALID_TEMPLATE_VECTOR" });
      }

      const algo = String((template as any)?.algo || "mediapipe.face_landmarker").trim();
      const version = String((template as any)?.version || "").trim();
      const dims = Number((template as any)?.dims || tplVector.length) || tplVector.length;

      const storedPayload = {
        algo,
        version,
        dims,
        template: tplVector,
      };

      const templateHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(storedPayload))
        .digest("hex");

      const faceId =
        String((template as any)?.faceId || "").trim() ||
        crypto
          .createHash("sha256")
          .update(String((user as any).identityHash || "") + "::" + templateHash)
          .digest("hex")
          .slice(0, 16);

      upsertFaceTemplate({
        identityHash: String((user as any).identityHash || "").trim(),
        template: JSON.stringify(storedPayload),
        algo,
        dims,
        templateHash,
        faceId,
      });
      return res.json({ ok: true, status: "OK", enrolled: true, username });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || "FACE_ENROLL_FAILED" });
    }
  });

  // Match a probe template against the stored face for the target user.
  router.post("/faces/match", (req: express.Request, res: express.Response) => {
    const body = req.body ?? {};
    const username = String(body.username || "").trim().toLowerCase();
    const template = body.template;
    const threshold = Number(body.threshold ?? 0.92);

    if (!username) return res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });

    const probeVector = Array.isArray(template)
      ? template
      : Array.isArray((template as any)?.template)
        ? (template as any).template
        : null;

    if (
      !probeVector ||
      probeVector.length < 8 ||
      !probeVector.every((n: any) => typeof n === "number" && Number.isFinite(n))
    ) {
      return res.status(400).json({ ok: false, status: "INVALID_TEMPLATE_VECTOR" });
    }

    const user = getUser(username);
    if (!user) {
      return res.status(200).json({
        ok: true,
        match: false,
        status: "USER_NOT_FOUND",
      });
    }

    const storedRow = getFaceTemplate(String((user as any).identityHash || "").trim());
    if (!storedRow) {
      return res.status(200).json({
        ok: true,
        match: false,
        status: "FACE_NOT_ENROLLED",
      });
    }

    let storedPayload: any = null;
    try {
      storedPayload =
        typeof (storedRow as any)?.template === "string"
          ? JSON.parse((storedRow as any).template)
          : (storedRow as any)?.template;
    } catch {
      storedPayload = null;
    }

    const storedVector = Array.isArray(storedPayload?.template) ? storedPayload.template : null;
    if (!storedVector || storedVector.length < 8) {
      return res.status(500).json({ ok: false, status: "STORED_TEMPLATE_CORRUPT" });
    }

    const storedFaces = [
      {
        id: String((storedRow as any)?.faceId || "enrolled"),
        identityHash: String(
          (storedRow as any)?.identityHash || String((user as any).identityHash || "")
        ),
        template: storedVector as number[],
        version: storedPayload?.version || undefined,
      },
    ];

    const out = matchFaceTemplate(probeVector as number[], storedFaces, {
      threshold,
      version: String(body.version || "").trim() || undefined,
    });

    return res.json({
      ok: true,
      status: "OK",
      match: out.match,
      best: out.best,
      score: out.best?.score ?? 0,
      threshold: out.threshold,
      candidates: out.candidates,
      dims: storedFaces[0].template.length,
      algo: storedPayload?.algo || (storedRow as any)?.algo || null,
      version: storedPayload?.version || null,
    });
  });

  return router;
}
