import type express from "express";

export function resolveHostNamespace(req: express.Request) {
  const xfHost = req.headers["x-forwarded-host"];
  const hostHeaderRaw =
    (Array.isArray(xfHost) ? xfHost[0] : xfHost) ||
    req.headers.host ||
    "";

  const first = String(hostHeaderRaw).split(",")[0].trim();
  const noProto = first.replace(/^https?:\/\//i, "");
  const hostnameOnly = noProto.split(":")[0].trim();
  return hostnameOnly || "unknown";
}

export function getHostSubdomain(hostname: string) {
  const parts = String(hostname || "").split(".").filter(Boolean);
  if (parts.length === 1 && parts[0] === "localhost") return "";
  if (parts.length === 2 && parts[1] === "localhost") return parts[0] || "";
  if (parts.length < 3) return "";
  return parts[0] || "";
}

export function isReservedLabel(label: string) {
  const x = String(label || "").toLowerCase();
  return x === "www" || x === "api";
}

export function normalizeUsernameLabel(raw: string) {
  const x = String(raw || "").trim().toLowerCase();
  const safe = x.replace(/[^a-z0-9_-]/g, "");
  if (!safe) return "";
  if (isReservedLabel(safe)) return "";
  return safe;
}

export function canonicalPair(a: string, b: string) {
  const A = normalizeUsernameLabel(a);
  const B = normalizeUsernameLabel(b);
  if (!A || !B) return "";
  const pair = [A, B].sort();
  return `${pair[0]}+${pair[1]}`;
}

export function getAtSelectorFromPath(req: express.Request) {
  const p = String(req.path || "");
  const m = p.match(/^\/\@([^\/\?#]+)(?:\/|$)/);
  if (!m) return null;
  const raw = String(m[1] || "").trim();
  if (!raw) return null;

  if (raw.includes("+")) {
    const parts = raw.split(/\+\+?/).map((s) => s.trim()).filter(Boolean);
    if (parts.length !== 2) return null;
    const pair = canonicalPair(parts[0], parts[1]);
    if (!pair) return null;
    return { kind: "relation" as const, pair };
  }

  const username = normalizeUsernameLabel(raw);
  if (!username) return null;
  return { kind: "user" as const, username };
}

export function getAtNestedUserFromPath(req: express.Request) {
  const p = String(req.path || "");
  const m = p.match(/^\/\@([^\/\?#]+)\/\@([^\/\?#]+)(?:\/|$)/);
  if (!m) return null;
  const a = normalizeUsernameLabel(String(m[1] || ""));
  const b = normalizeUsernameLabel(String(m[2] || ""));
  if (!a || !b) return null;
  return { a, b };
}

export function resolveChainNamespace(req: express.Request) {
  const host = resolveHostNamespace(req);
  if (!host) return "unknown";

  if (host.endsWith(".localhost")) {
    const sub = host.replace(/\.localhost$/i, "");
    if (sub && !isReservedLabel(sub)) return `localhost/users/${sub}`;
    return "localhost";
  }

  const atSel = getAtSelectorFromPath(req);
  const atNested = getAtNestedUserFromPath(req);
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

  const sub = getHostSubdomain(host);
  if (!sub || isReservedLabel(sub)) return host;
  const parts = host.split(".");
  const root = parts.slice(1).join(".");
  return root ? `${root}/users/${sub}` : host;
}

export function resolveNamespace(req: express.Request) {
  return resolveChainNamespace(req);
}

export function resolveLens(req: express.Request) {
  const q: any = req.query || {};
  const me = String(q.me ?? "").trim();
  const view = String(q.view ?? "").trim().toLowerCase();
  if (me === "1" || me.toLowerCase() === "true") return "me";
  if (view) return view;
  return "raw";
}

export function filterBlocksByNamespace(allBlocks: any[], ns: string) {
  if (!ns) return allBlocks;
  const prefix = ns.endsWith("/") ? ns : `${ns}/`;
  return allBlocks.filter((b: any) => {
    const n = String(b?.namespace || "");
    return n === ns || n.startsWith(prefix);
  });
}
