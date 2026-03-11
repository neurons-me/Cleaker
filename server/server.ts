import express from "express";
import cors from "cors";
import { db, DB_PATH } from "./src/Blockchain/db";
import { appendBlock, getAllBlocks } from "./src/Blockchain/blockchain";
import { getAllUsers } from "./src/Blockchain/users";
import { getClaim } from "./src/claim/records";
import { isNamespaceWriteAuthorized, recordMemory } from "./src/claim/replay";
import {
  filterBlocksByNamespace,
  resolveHostNamespace,
  resolveLens,
  resolveNamespace,
} from "./src/http/namespace";
import { normalizeHttpRequestToMeTarget } from "./src/http/meTarget";
import { createEnvelope, createErrorEnvelope } from "./src/http/envelope";
import { createPathResolverHandler } from "./src/http/pathResolver";
import { createClaimsRouter } from "./src/http/claims";
import { createLegacyRouter } from "./src/http/legacy";
import { GUI_PKG_DIST_DIR, htmlShell, wantsHtml } from "./src/http/shell";

const PORT = process.env.PORT || 8161;
const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

// Serve built GUI assets from this.GUI package dist
app.use("/gui", express.static(GUI_PKG_DIST_DIR));

// Bootstrap endpoint for GUI runtime (namespace + endpoint hints)
app.get("/__bootstrap", (req, res) => {
  const namespace = resolveNamespace(req);
  const host = resolveHostNamespace(req);
  const origin = `${req.protocol}://${host}`;
  const target = normalizeHttpRequestToMeTarget(req);
  return res.json(createEnvelope(target, { host, namespace, apiOrigin: origin }));
});

// HTML shell for root and any deep route when Accept: text/html
app.get("/", (req, res, next) => {
  if (!wantsHtml(req)) return next();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(htmlShell());
});
// Minimal request logger (no identity semantics, only transport info)
app.use((req, _res, next) => {
  const ns = resolveNamespace(req);
  const host = resolveHostNamespace(req);
  const lens = resolveLens(req);
  const target = normalizeHttpRequestToMeTarget(req);
  console.log(
    `→ ${req.method} ${req.url} host=${host || "unknown"} ns=${ns} lens=${lens} op=${target.operation} me=${target.meTarget}`
  );
  next();
});

// --- Universal Ledger Write Surface ---------------------------------
// Accept ANY ME block (or arbitrary JSON) and append me to the ledger.
app.post("/", async (req: express.Request, res: express.Response) => {
  const body = req.body;
  const target = normalizeHttpRequestToMeTarget(req);
  if (!body || typeof body !== "object") {
    return res.status(400).json(createErrorEnvelope(target, {
      error: "Expected JSON block in request body",
    }));
  }

  const blockId = crypto.randomUUID();
  const timestamp = Date.now();
  const namespace = resolveNamespace(req);
  const claim = getClaim(namespace);

  if (claim) {
    const authorized = isNamespaceWriteAuthorized({
      claimIdentityHash: claim.identityHash,
      claimPublicKey: claim.publicKey,
      body,
    });

    if (!authorized) {
      return res.status(403).json(createErrorEnvelope(target, {
        error: "NAMESPACE_WRITE_FORBIDDEN",
      }));
    }
  }

  const blockIdentityHash = claim
    ? claim.identityHash
    : String((body as any).identityHash || "").trim();

  const entry = await appendBlock({
    blockId,
    timestamp,
    namespace,
    identityHash: blockIdentityHash,
    expression: body.expression || "",
    json: body,
  });

  recordMemory({
    namespace,
    payload: body,
    identityHash: blockIdentityHash,
    timestamp,
  });

  console.log("🧱 New Ledger Block:");
  console.log(JSON.stringify(entry, null, 2));
  return res.json(createEnvelope(target, {
    blockId,
    timestamp,
  }));
});

// --- Universal Ledger Read Surface ----------------------
app.get("/", async (req: express.Request, res: express.Response) => {
  const chainNs = resolveNamespace(req);
  const lens = resolveLens(req);
  const target = normalizeHttpRequestToMeTarget(req);
  const limit = Math.max(1, Math.min(5000, Number((req.query as any)?.limit ?? 5000)));
  const identityHash = String((req.query as any)?.identityHash || "").trim();

  const all = await getAllBlocks();
  const users = await getAllUsers();

  let blocks = filterBlocksByNamespace(all, chainNs);
  if (identityHash) {
    blocks = blocks.filter((b: any) => String(b?.identityHash || "") === identityHash);
  }

  // newest-first and limit
  blocks = blocks
    .slice()
    .sort((a: any, b: any) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0))
    .slice(0, limit);

  return res.json(createEnvelope(target, {
    namespace: chainNs,
    lens,
    users,
    blocks,
    count: blocks.length,
  }));
});

// Explicit blocks endpoint (same semantics as GET /, but clearer name)
app.get("/blocks", async (req: express.Request, res: express.Response) => {
  // Delegate by rewriting url semantics in place
  // (Keep implementation simple by copying the same logic.)
  const ns = resolveNamespace(req);
  const lens = resolveLens(req);
  const target = normalizeHttpRequestToMeTarget(req);
  const limit = Math.max(1, Math.min(5000, Number((req.query as any)?.limit ?? 5000)));
  const identityHash = String((req.query as any)?.identityHash || "").trim();

  const all = await getAllBlocks();
  let blocks = filterBlocksByNamespace(all, ns);
  if (identityHash) {
    blocks = blocks.filter((b: any) => String(b?.identityHash || "") === identityHash);
  }

  blocks = blocks
    .slice()
    .sort((a: any, b: any) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0))
    .slice(0, limit);

  return res.json(createEnvelope(target, {
    namespace: ns,
    lens,
    blocks,
    count: blocks.length,
  }));
});

// --- Convenience: allow GET /@... to behave like GET / but with path-based namespace addressing.
// NOTE: This MUST be defined before the catch-all path resolver.
app.get("/@*", async (req: express.Request, res: express.Response) => {
  const chainNs = resolveNamespace(req);
  const lens = resolveLens(req);
  const target = normalizeHttpRequestToMeTarget(req);
  const limit = Math.max(1, Math.min(5000, Number((req.query as any)?.limit ?? 5000)));
  const identityHash = String((req.query as any)?.identityHash || "").trim();

  const all = await getAllBlocks();

  let blocks = filterBlocksByNamespace(all, chainNs);
  if (identityHash) {
    blocks = blocks.filter((b: any) => String(b?.identityHash || "") === identityHash);
  }

  blocks = blocks
    .slice()
    .sort((a: any, b: any) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0))
    .slice(0, limit);

  return res.json(createEnvelope(target, {
    namespace: chainNs,
    lens,
    blocks,
    count: blocks.length,
  }));
});

// Legacy extensions: username claims and biometric matching remain available,
// but they are no longer presented as core cleaker semantics.
app.use(createClaimsRouter());
app.use(createLegacyRouter());


// --- Path Resolver Catch-all (MUST be last route before app.listen) ---
app.get("/*", (req, res, next) => {
  // If a browser is requesting HTML, always return the SPA shell.
  if (wantsHtml(req)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(htmlShell());
  }
  return createPathResolverHandler()(req, res);
});
// --- Start Server ----------------------------------------
app.listen(PORT, () => {
  console.log(`\n🚀 Cleaker running at: http://localhost:${PORT}`);
  console.log("\n∴ Material Surface");
  console.log(`  - Ledger DB:      ${DB_PATH}`);
  console.log("  - Give thought:   POST /        (append JSON into current namespace)");
  console.log("  - Reach thought:  GET  /        (read current namespace surface)");
  console.log("  - Read blocks:    GET  /blocks  (explicit block stream view)");

  console.log("\n🔐 Claim Surface");
  console.log("  - Claim space:    POST /claims       (forge claim record + encrypted noise)");
  console.log("  - Open space:     POST /claims/open  (verify trinity -> recover noise)");

  console.log("\n🌐 Routing / Namespaces");
  console.log("  - Host header determines the chain namespace");
  console.log("  - Examples:");
  console.log("    • cleaker.me                 -> cleaker.me");
  console.log("    • username.cleaker.me        -> cleaker.me/users/username");
  console.log("    • username.localhost         -> localhost/users/username");
  console.log("    • cleaker.me/@username        -> cleaker.me/users/username (path-based)");
  console.log("    • localhost/@username         -> localhost/users/username (path-based)");
  console.log("    • cleaker.me/@a+b             -> cleaker.me/relations/a+b (symmetric relation)");
  console.log("    • cleaker.me/@a/@b            -> cleaker.me/users/a/users/b (directional nesting)");

  console.log("\n🔎 Namespace Reads");
  console.log("  - Resolve path:   GET  /<any/path>   e.g. /profile/displayName");
  console.log("    (Resolves within the chain namespace derived from host)");

  console.log("\n🕰 Legacy Extensions");
  console.log("  - Claim username: POST /users");
  console.log("  - Lookup user:    GET  /users/:username");
  console.log("  - Enroll face:    POST /faces/enroll");
  console.log("  - Match face:     POST /faces/match\n");
});
