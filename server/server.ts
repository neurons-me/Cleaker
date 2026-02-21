import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { db, DB_PATH } from "./src/Blockchain/db";
import { appendBlock, getAllBlocks } from "./src/Blockchain/blockchain";
import { claimUser, getAllUsers, getUser } from "./src/Blockchain/users";
import { upsertFaceTemplate, getFaceTemplate } from "./src/Blockchain/faces";
import { matchFaceTemplate } from "./src/Blockchain/faceMatch";
function resolveHostNamespace(req: express.Request) {
  // Prefer proxy-provided host when present (Netget / nginx / etc)
  const xfHost = req.headers["x-forwarded-host"];
  const hostHeaderRaw =
    (Array.isArray(xfHost) ? xfHost[0] : xfHost) ||
    req.headers.host ||
    "";

  // x-forwarded-host can be a comma-separated list
  const first = String(hostHeaderRaw).split(",")[0].trim();
  // Drop protocol if some proxy accidentally includes it
  const noProto = first.replace(/^https?:\/\//i, "");
  // If host includes port, remove it (keep only hostname)
  const hostnameOnly = noProto.split(":")[0].trim();
  return hostnameOnly || "unknown";
}

function normalizeNamespace(input: unknown) {
  const raw = String(Array.isArray(input) ? input[0] : input || "").trim();
  if (!raw) return "";
  // Remove protocol if present
  const noProto = raw.replace(/^https?:\/\//i, "");
  // Take first if comma-separated (proxy headers)
  const first = noProto.split(",")[0].trim();
  // Strip port
  const hostnameOnly = first.split(":")[0].trim();
  return hostnameOnly;
}

function resolveNamespaceForQuery(req: express.Request) {
  // 1) explicit querystring wins
  const fromQuery = normalizeNamespace((req.query as any)?.ns);
  if (fromQuery) return fromQuery;
  // 2) fallback to host-derived namespace
  return resolveHostNamespace(req);
}

function getHostSubdomain(hostname: string) {
  // hostname is expected WITHOUT port (see resolveHostNamespace)
  const parts = String(hostname || "").split(".").filter(Boolean);
  // Special-case localhost/dev hosts. We treat `username.localhost` as a user node.
  if (parts.length === 1 && parts[0] === "localhost") return "";
  if (parts.length === 2 && parts[1] === "localhost") return parts[0] || "";
  // For real domains, require at least 3 labels to treat the left-most as a username.
  // Example: username.cleaker.me -> subdomain `username`
  // Example: cleaker.me          -> no username subdomain
  if (parts.length < 3) return "";
  return parts[0] || "";
}

function isReservedLabel(label: string) {
  const x = String(label || "").toLowerCase();
  // Keep this list tiny. We are explicitly NOT reserving `me`.
  return x === "www" || x === "api";
}

function normalizeUsernameLabel(raw: string) {
  const x = String(raw || "").trim().toLowerCase();
  // Allow a-z, 0-9, underscore, dash. (Keep it conservative.)
  const safe = x.replace(/[^a-z0-9_-]/g, "");
  if (!safe) return "";
  if (isReservedLabel(safe)) return "";
  return safe;
}

function canonicalPair(a: string, b: string) {
  // Symmetric relation node: ensure stable ordering
  const A = normalizeUsernameLabel(a);
  const B = normalizeUsernameLabel(b);
  if (!A || !B) return "";
  const pair = [A, B].sort();
  return `${pair[0]}+${pair[1]}`;
}

function getAtSelectorFromPath(req: express.Request) {
  // Supports path-based identity addressing selectors.
  // Examples:
  //   /@username
  //   /@username/profile/displayName
  //   /@a+b/profile/displayName     (symmetric relation)
  //   /@a++b/profile/displayName    (symmetric relation, synonym)
  //   /@a/@b/profile/displayName    (directional nesting)
  //
  // Returns a selector object or null.
  const p = String(req.path || "");
  const m = p.match(/^\/\@([^\/\?#]+)(?:\/|$)/);
  if (!m) return null;
  const raw = String(m[1] || "").trim();
  if (!raw) return null;
  // Relation: a+b or a++b
  if (raw.includes("+")) {
    const parts = raw.split(/\+\+?/).map((s) => s.trim()).filter(Boolean);
    if (parts.length !== 2) return null;
    const pair = canonicalPair(parts[0], parts[1]);
    if (!pair) return null;
    return { kind: "relation" as const, pair };
  }

  // Single user
  const username = normalizeUsernameLabel(raw);
  if (!username) return null;
  return { kind: "user" as const, username };
}

function getAtNestedUserFromPath(req: express.Request) {
  // Supports directional nesting:
  //   /@a/@b/...
  // Returns { a, b } or null.
  const p = String(req.path || "");
  const m = p.match(/^\/\@([^\/\?#]+)\/\@([^\/\?#]+)(?:\/|$)/);
  if (!m) return null;
  const a = normalizeUsernameLabel(String(m[1] || ""));
  const b = normalizeUsernameLabel(String(m[2] || ""));
  if (!a || !b) return null;
  return { a, b };
}

function resolveChainNamespace(req: express.Request) {
  // Canonical chain namespace is based on the host-derived namespace.
  // Examples:
  // - cleaker.me           -> "cleaker.me"
  // - username.cleaker.me  -> "cleaker.me/users/username"
  // - username.localhost   -> "localhost/users/username"
  const host = resolveHostNamespace(req);
  if (!host) return "unknown";
  // Special-case *.localhost (dev). Treat `username.localhost` as user node of `localhost`.
  if (host.endsWith(".localhost")) {
    const sub = host.replace(/\.localhost$/i, "");
    if (sub && !isReservedLabel(sub)) return `localhost/users/${sub}`;
    return "localhost";
  }

  const atSel = getAtSelectorFromPath(req);
  const atNested = getAtNestedUserFromPath(req);

  // Path-based identity addressing on the root host:
  //   Host: cleaker.me  +  Path: /@jabellae/...          -> cleaker.me/users/jabellae
  //   Host: cleaker.me  +  Path: /@a+b/...               -> cleaker.me/relations/a+b
  //   Host: cleaker.me  +  Path: /@a/@b/...              -> cleaker.me/users/a/users/b
  //   Host: localhost   +  Path: /@username/...          -> localhost/users/username
  // Note: We only apply this when the host does NOT already specify a user subdomain.
  if (atSel || atNested) {
    const maybeSub = getHostSubdomain(host);
    if (!maybeSub || isReservedLabel(maybeSub)) {
      const base = host === "localhost" ? "localhost" : host;
      if (atNested) {
        return `${base}/users/${atNested.a}/users/${atNested.b}`;
      }

      if (atSel?.kind === "relation") {
        return `${base}/relations/${atSel.pair}`;
      }

      if (atSel?.kind === "user") {
        return `${base}/users/${atSel.username}`;
      }
    }
  }

  // General case: treat left-most label as optional user.
  const sub = getHostSubdomain(host);
  if (!sub || isReservedLabel(sub)) return host;
  // Root domain is everything after the first label.
  const parts = host.split(".");
  const root = parts.slice(1).join(".");
  return root ? `${root}/users/${sub}` : host;
}

function resolveNamespace(req: express.Request) {
  // Namespace is ALWAYS chain-derived. Querystring `ns` is treated as an optional view/lens.
  return resolveChainNamespace(req);
}

function resolveLens(req: express.Request) {
  // Optional lens/view (NOT an override of namespace).
  // Examples:
  //   /?me=1
  //   /?view=me
  const q: any = req.query || {};
  const me = String(q.me ?? "").trim();
  const view = String(q.view ?? "").trim().toLowerCase();
  if (me === "1" || me.toLowerCase() === "true") return "me";
  if (view) return view;
  return "raw";
}

const PORT = process.env.PORT || 8161;
const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

// Namespace filtering helper:
// If host resolves to "cleaker.me", also include per-user namespaces like "cleaker.me/users/alice".
function filterBlocksByNamespace(allBlocks: any[], ns: string) {
  if (!ns) return allBlocks;
  const prefix = ns.endsWith("/") ? ns : `${ns}/`;
  return allBlocks.filter((b: any) => {
    const n = String(b?.namespace || "");
    return n === ns || n.startsWith(prefix);
  });
}

// --- HTML Shell (SPA) ------------------------------------------------
// If a browser requests HTML, return the GUI shell. Everything else remains JSON.
// This allows `/` and any deep link to load the same app, while XHR/fetch gets JSON.

// this.GUI npm package dist folder (browser build)
// Expected files: this.gui.es.js, this.gui.css, favicon.ico, etc.
const GUI_PKG_DIST_DIR = process.env.GUI_PKG_DIST_DIR
  ? path.resolve(process.env.GUI_PKG_DIST_DIR)
  : path.resolve(
      "/Users/suign/Desktop/Neuroverse/all.this/this/GUI/npm/dist"
    );

function wantsHtml(req: express.Request) {
  const accept = String(req.headers.accept || "");
  return accept.includes("text/html");
}

// Serve built GUI assets from this.GUI package dist
app.use("/gui", express.static(GUI_PKG_DIST_DIR));

function htmlShell() {
  // Minimal shell that loads this.GUI as an ESM module and bootstraps from the ledger.
  // NOTE: Replace GUI.mount/render API calls below when you finalize the renderer API.
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <link rel="icon" href="/gui/favicon.ico" />
    <link rel="stylesheet" href="/gui/this.gui.css" />
    <title>cleaker.me</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      // Polyfill Node-style globals expected by some UMD bundles
      // (this.GUI UMD currently references \`process.env.NODE_ENV\`)
      if (!globalThis.process) {
        globalThis.process = { env: { NODE_ENV: 'production' } };
      } else if (!globalThis.process.env) {
        globalThis.process.env = { NODE_ENV: 'production' };
      } else if (!('NODE_ENV' in globalThis.process.env)) {
        globalThis.process.env.NODE_ENV = 'production';
      }
      // Ensure React globals exist for the UMD bundle
      const React = globalThis.React;
      const ReactDOM = globalThis.ReactDOM;
      if (!React) throw new Error('React global is missing. Failed to load react.production.min.js');
      if (!ReactDOM) throw new Error('ReactDOM global is missing. Failed to load react-dom.production.min.js');
      // Load this.GUI UMD bundle (expects global React/ReactDOM)
      await import('/gui/this.gui.umd.js');
      // Most UMD bundles attach themselves on window/globalThis
      const GUI = globalThis.ThisGUI || globalThis.thisGUI || globalThis.GUI || globalThis['this.gui'];
      // 1) bootstrap (namespace, host, etc)
      const boot = await fetch("/__bootstrap").then(r => r.json());
      // 2) fetch semantic entry/spec (you can change this endpoint later)
      // If not implemented, it will 404; that's OK during bring-up.
      let spec = null;
      try {
        spec = await fetch(\`/gui/entry?ns=\${encodeURIComponent(boot.namespace)}\`).then(r => r.json());
      } catch (e) {
        spec = null;
      }

      // 3) render (placeholder)
      // Implement one of these in your GUI runtime when ready:
      //   GUI.mount({ target: document.querySelector('#app'), spec, boot })
      //   GUI.renderSpec(spec, { boot, target: ... })
      const guiRuntime = (GUI && (GUI.default || GUI.GUI || GUI)) || {};
      console.log("GUI boot", boot);
      console.log("GUI spec", spec);
      console.log("GUI runtime", guiRuntime);
      // Temporary visible UI so you know the shell loaded:
      const el = document.querySelector('#app');
      if (el) {
        const pre = document.createElement('pre');
        pre.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        pre.style.padding = '16px';
        pre.textContent = \`cleaker GUI shell loaded\\nnamespace: \${boot.namespace}\\nhost: \${boot.host}\\n(apiOrigin: \${boot.apiOrigin})\\nGUI global: \${GUI ? 'present' : 'missing'}\`;
        el.innerHTML = '';
        el.appendChild(pre);
      }

      // If your GUI runtime exposes a mount function, you can enable it here later.
      // Example:
      // if (GUI && typeof GUI.mount === 'function') GUI.mount({ target: document.querySelector('#app'), spec, boot });
    </script>
  </body>
</html>`;
}

// Bootstrap endpoint for GUI runtime (namespace + endpoint hints)
app.get("/__bootstrap", (req, res) => {
  const namespace = resolveNamespace(req);
  const host = resolveHostNamespace(req);
  const origin = `${req.protocol}://${host}`;
  return res.json({ ok: true, host, namespace, apiOrigin: origin });
});

// HTML shell for root and any deep route when Accept: text/html
app.get("/", (req, res, next) => {
  if (!wantsHtml(req)) return next();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(htmlShell());
});
console.log("🔗 Blockchain DB:", DB_PATH);
// Minimal request logger (no identity semantics, only transport info)
app.use((req, _res, next) => {
  const ns = resolveNamespace(req);
  const host = resolveHostNamespace(req);
  const lens = resolveLens(req);
  console.log(
    `→ ${req.method} ${req.url} host=${host || "unknown"} ns=${ns} lens=${lens}`
  );
  next();
});

// --- Universal Ledger Write Surface ---------------------------------
// Accept ANY ME block (or arbitrary JSON) and append me to the ledger.
app.post("/", async (req: express.Request, res: express.Response) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({
      ok: false,
      error: "Expected JSON block in request body"
    });
  }

  const blockId = crypto.randomUUID();
  const timestamp = Date.now();
  const namespace = resolveNamespace(req);
  const entry = await appendBlock({
    blockId,
    timestamp,
    namespace,
    identityHash: body.identityHash || "",
    expression: body.expression || "",
    json: JSON.stringify(body)
  });
  console.log("🧱 New Ledger Block:");
  console.log(JSON.stringify(entry, null, 2));
  return res.json({ ok: true, blockId, timestamp });
});

// --- Universal Ledger Read Surface ----------------------
app.get("/", async (req: express.Request, res: express.Response) => {
  const chainNs = resolveNamespace(req);
  const lens = resolveLens(req);
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

  return res.json({
    ok: true,
    namespace: chainNs,
    lens,
    users,
    blocks,
    count: blocks.length,
  });
});

// Explicit blocks endpoint (same semantics as GET /, but clearer name)
app.get("/blocks", async (req: express.Request, res: express.Response) => {
  // Delegate by rewriting url semantics in place
  // (Keep implementation simple by copying the same logic.)
  const ns = resolveNamespace(req);
  const lens = resolveLens(req);
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

  return res.json({ ok: true, namespace: ns, lens, blocks, count: blocks.length });
});

// --- Convenience: allow GET /@... to behave like GET / but with path-based namespace addressing.
// NOTE: This MUST be defined before the catch-all path resolver.
app.get("/@*", async (req: express.Request, res: express.Response) => {
  const chainNs = resolveNamespace(req);
  const lens = resolveLens(req);
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

  return res.json({
    ok: true,
    namespace: chainNs,
    lens,
    blocks,
    count: blocks.length,
  });
});

// --- User lookup -------------------------------------------
// Fetch a single claimed username
app.get("/users/:username", (req: express.Request, res: express.Response) => {
  const username = String(req.params.username || "").trim().toLowerCase();
  if (!username) return res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });

  const user = getUser(username);
  if (!user) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });

  return res.json({ ok: true, user });
});

// --- Claim username (cleak identity) ------------------------
// Claims a username on this host's ledger.
// Body: { username: string, identityHash: string, publicKey: string }
app.post("/users", (req: express.Request, res: express.Response) => {
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

// --- Face template enroll -----------------------------------
// Stores a face template payload for a username on this ledger.
// Body: { username: string, template: any }
app.post("/faces/enroll", (req: express.Request, res: express.Response) => {
  const body = req.body ?? {};
  const username = String(body.username || "").trim().toLowerCase();
  const template = body.template;

  if (!username) return res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });
  if (!template || (typeof template !== "object" && !Array.isArray(template))) {
    return res.status(400).json({ ok: false, error: "TEMPLATE_REQUIRED" });
  }

  try {
    // Store under the user's identityHash (canonical) not the raw username.
    const user = getUser(username);
    if (!user) {
      return res.status(200).json({
        ok: true,
        enrolled: false,
        status: "USER_NOT_FOUND",
      });
    }

    // Accept either a raw numeric vector (number[]) or an object containing { template: number[] }.
    const tplVector = Array.isArray(template)
      ? template
      : Array.isArray((template as any)?.template)
        ? (template as any).template
        : null;

    if (!tplVector || tplVector.length < 8 || !tplVector.every((n: any) => typeof n === "number" && Number.isFinite(n))) {
      return res.status(400).json({ ok: false, status: "INVALID_TEMPLATE_VECTOR" });
    }

    const algo = String((template as any)?.algo || "mediapipe.face_landmarker").trim();
    const version = String((template as any)?.version || "").trim();
    const dims = Number((template as any)?.dims || tplVector.length) || tplVector.length;

    // Store a stable payload in DB: meta + vector
    const storedPayload = {
      algo,
      version,
      dims,
      template: tplVector,
    };

    // Hash for dedupe/audit
    const templateHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(storedPayload))
      .digest("hex");

    const faceId =
      String((template as any)?.faceId || "").trim() ||
      crypto.createHash("sha256").update(String((user as any).identityHash || "") + "::" + templateHash).digest("hex").slice(0, 16);

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

// --- Face template match -------------------------------------
app.post("/faces/match", (req: express.Request, res: express.Response) => {
  const body = req.body ?? {};
  const username = String(body.username || "").trim().toLowerCase();
  const template = body.template;
  const threshold = Number(body.threshold ?? 0.92);

  if (!username) return res.status(400).json({ ok: false, error: "USERNAME_REQUIRED" });

  // Accept either a raw numeric vector (number[]) or an object containing { template: number[] }.
  const probeVector = Array.isArray(template)
    ? template
    : Array.isArray((template as any)?.template)
      ? (template as any).template
      : null;

  if (!probeVector || probeVector.length < 8 || !probeVector.every((n: any) => typeof n === "number" && Number.isFinite(n))) {
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
    storedPayload = typeof (storedRow as any)?.template === "string"
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
      identityHash: String((storedRow as any)?.identityHash || String((user as any).identityHash || "")),
      template: storedVector as number[],
      version: storedPayload?.version || undefined,
    },
  ];

  const out = matchFaceTemplate(
    probeVector as number[],
    storedFaces,
    {
      threshold,
      version: String(body.version || "").trim() || undefined,
    }
  );

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


// --- Path Resolver ---------------------------------------
// Treat all other GET paths as semantic resolution against the resolved namespace.
// Examples:
//   GET https://jabellae.cleaker.me/profile/displayName
//   GET https://cleaker.me/@jabellae/profile/displayName
//   -> resolves within namespace "cleaker.me/users/jabellae" and returns the latest value.
//
// IMPORTANT: place this AFTER /blocks and /@* and AFTER legacy /users and /faces routes.
// Express matches in order; a catch-all will otherwise swallow more specific routes.
function createPathResolverHandler() {
  return async (req: express.Request, res: express.Response) => {
    // Ignore the root path (handled by GET /)
    const rawPath = String(req.path || "");
    const trimmed = rawPath.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!trimmed) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    // Namespace is derived from host + optional /@ selectors (see resolveNamespace)
    const namespace = resolveNamespace(req);

    // Allow `/@username/...` addressing without polluting the semantic path.
    // If the first segment is `@username`, strip it.
    const segments0 = trimmed.split("/").filter(Boolean);

    // Strip any leading selector segments:
    //   @user
    //   @a+b (encoded in first segment)
    //   @a, @b (two segments)
    let segments = segments0;
    if (segments.length > 0 && segments[0].startsWith("@")) {
      segments = segments.slice(1);
      if (segments.length > 0 && segments0.length > 1 && segments0[1].startsWith("@")) {
        // Handles /@a/@b/... by stripping the second selector too.
        segments = segments.slice(1);
      }
    }

    const dotPath = segments.join(".");
    if (!dotPath) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const all = await getAllBlocks();
    const blocks = all
      .filter((b: any) => String(b?.namespace || "") === String(namespace))
      .slice()
      .sort((a: any, b: any) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0));

    // Build a shallow semantic state from newest to oldest.
    // Rule: a block contributes a value to `state[expression] = payload.value || payload`.
    type LedgerBlockLike = {
      namespace?: string;
      timestamp?: number;
      identityHash?: string;
      expression?: string;
      json?: unknown;
    };
    const state: Record<string, any> = {};
    for (const bRaw of blocks) {
      const b = bRaw as LedgerBlockLike;
      try {
        const rawJson = b?.json;
        const payload =
          typeof rawJson === "string"
            ? JSON.parse(rawJson)
            : (rawJson as any);
        const expr = String((payload as any)?.expression || b?.expression || "").trim();
        if (!expr) continue;

        // If payload has explicit `value`, use it; otherwise use payload as the value
        const value = Object.prototype.hasOwnProperty.call(payload ?? {}, "value")
          ? (payload as any).value
          : payload;

        // Only set if not already set (newest wins because we iterate newest-first)
        if (!(expr in state)) state[expr] = value;
      } catch {
        // ignore bad json
      }
    }

    // Support both dot and slash forms by converting requested path to dot form.
    const getByPath = (obj: any, path: string) => {
      const parts = String(path || "").split(".").filter(Boolean);
      let cur = obj;
      for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
      }
      return cur;
    };

    // 1) Direct match: if someone posted a block with expression === dotPath
    if (dotPath in state) {
      return res.json({
        ok: true,
        namespace,
        path: dotPath,
        value: state[dotPath],
      });
    }

    // 2) Prefix fold: build nested object by folding expressions like "profile.displayName"
    const tree: Record<string, any> = {};
    const setDeep = (obj: any, path: string, value: any) => {
      const parts = String(path || "").split(".").filter(Boolean);
      let cur = obj;
      for (let i = 0; i < parts.length; i++) {
        const key = parts[i];
        const isLast = i === parts.length - 1;
        if (isLast) {
          if (!(key in cur)) cur[key] = value;
        } else {
          if (typeof cur[key] !== "object" || cur[key] == null || Array.isArray(cur[key])) {
            cur[key] = {};
          }
          cur = cur[key];
        }
      }
    };

    for (const [expr, value] of Object.entries(state)) {
      setDeep(tree, expr, value);
    }

    // 3) Then resolve dotPath within that nested object
    const resolved = getByPath(tree, dotPath);
    if (typeof resolved === "undefined") {
      return res.status(404).json({ ok: false, namespace, path: dotPath, error: "PATH_NOT_FOUND" });
    }

    return res.json({ ok: true, namespace, path: dotPath, value: resolved });
  };
}
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
  console.log(`\n🚀 Cleaker Blockchain running at: http://localhost:${PORT}`);
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

  console.log("\n🧱 Ledger");
  console.log("  - Append block:   POST /        (JSON body; optional ?view=me or ?me=1)" );
  console.log("  - Read ledger:    GET  /        (filters: ?limit=, ?identityHash=)" );
  console.log("  - Read ledger:    GET  /blocks  (same as GET /, clearer name)" );

  console.log("\n🔎 Semantic reads (path resolver)");
  console.log("  - Resolve path:   GET  /<any/path>   e.g. /profile/displayName" );
  console.log("    (Resolves within the chain namespace derived from host)" );

  console.log("\n👤 User registry (legacy / still available)");
  console.log("  - Claim username: POST /users" );
  console.log("  - Lookup user:    GET  /users/:username" );

  console.log("\n🙂 Face templates (legacy / still available)");
  console.log("  - Enroll face:    POST /faces/enroll" );
  console.log("  - Match face:     POST /faces/match\n" );
});
