import express from "express";
import { claimNamespace, openNamespace } from "../claim/records";
import { getMemoriesForNamespace } from "../claim/replay";

export function createClaimsRouter() {
  const router = express.Router();

  router.post("/claims", (req: express.Request, res: express.Response) => {
    const body = req.body ?? {};
    const out = claimNamespace({
      namespace: String(body.namespace || ""),
      secret: String(body.secret || ""),
      publicKey: String(body.publicKey || "").trim() || null,
    });

    if (!out.ok) {
      const status =
        out.error === "NAMESPACE_TAKEN"
          ? 409
          : out.error === "NAMESPACE_REQUIRED" || out.error === "SECRET_REQUIRED"
            ? 400
            : 500;
      return res.status(status).json({ ok: false, error: out.error });
    }

    return res.status(201).json({
      ok: true,
      namespace: out.record.namespace,
      identityHash: out.record.identityHash,
      createdAt: out.record.createdAt,
    });
  });

  router.post("/claims/open", (req: express.Request, res: express.Response) => {
    const body = req.body ?? {};
    const out = openNamespace({
      namespace: String(body.namespace || ""),
      secret: String(body.secret || ""),
    });

    if (!out.ok) {
      const status =
        out.error === "CLAIM_NOT_FOUND"
          ? 404
          : out.error === "CLAIM_VERIFICATION_FAILED"
            ? 403
            : out.error === "NAMESPACE_REQUIRED" || out.error === "SECRET_REQUIRED"
              ? 400
              : 500;
      return res.status(status).json({ ok: false, error: out.error });
    }

    const memories = getMemoriesForNamespace(out.record.namespace);

    return res.json({
      ok: true,
      namespace: out.record.namespace,
      identityHash: out.record.identityHash,
      noise: out.noise,
      memories,
      openedAt: Date.now(),
    });
  });

  return router;
}
