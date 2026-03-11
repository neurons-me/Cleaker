import type express from "express";
import { resolveHostNamespace, resolveNamespace } from "./namespace";

export type MeOperationKind = "read" | "write" | "claim" | "open";

export interface NormalizedMeTarget {
  host: string;
  namespace: string;
  operation: MeOperationKind;
  path: string;
  meTarget: string;
}

function normalizePathSegments(rawPath: string) {
  const trimmed = String(rawPath || "").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) return "";

  const segments0 = trimmed.split("/").filter(Boolean);
  let segments = segments0;

  if (segments.length > 0 && segments[0].startsWith("@")) {
    segments = segments.slice(1);
    if (segments.length > 0 && segments0.length > 1 && segments0[1].startsWith("@")) {
      segments = segments.slice(1);
    }
  }

  return segments.join(".");
}

function inferOperation(req: express.Request): MeOperationKind {
  if (req.method === "POST" && req.path === "/claims") return "claim";
  if (req.method === "POST" && req.path === "/claims/open") return "open";
  if (req.method === "POST") return "write";
  return "read";
}

function inferNamespace(req: express.Request): string {
  const operation = inferOperation(req);
  if (operation === "claim" || operation === "open") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    return String(body.namespace || "").trim() || resolveNamespace(req);
  }
  return resolveNamespace(req);
}

export function normalizeHttpRequestToMeTarget(req: express.Request): NormalizedMeTarget {
  const host = resolveHostNamespace(req);
  const operation = inferOperation(req);
  const namespace = inferNamespace(req);
  const path = operation === "claim" || operation === "open"
    ? ""
    : normalizePathSegments(req.path);

  return {
    host,
    namespace,
    operation,
    path,
    meTarget: `me://${namespace}:${operation}/${path || "_"}`,
  };
}
