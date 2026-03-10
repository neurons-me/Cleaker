export type NamespaceBind = 'none' | 'self';

export interface NamespaceRegion {
  domain: string;
  subdomain: string | null;
  port: number | null;
  path: string[];
  bind: NamespaceBind;
}

export interface ParseNamespaceRegionOptions {
  defaultBind?: NamespaceBind;
}

export function createNamespaceRegion(input: NamespaceRegion): NamespaceRegion {
  return {
    domain: normalizeDomain(input.domain),
    subdomain: normalizeSubdomain(input.subdomain),
    port: input.port ?? null,
    path: normalizePath(input.path),
    bind: input.bind ?? 'none',
  };
}

export function parseNamespaceRegion(
  input: string,
  options: ParseNamespaceRegionOptions = {},
): NamespaceRegion {
  const raw = String(input ?? '').trim();
  if (!raw) throw new Error('Namespace region cannot be empty');

  const normalized = raw.includes('://') ? raw : `https://${raw}`;
  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase();
  const labels = hostname.split('.').filter(Boolean);

  if (labels.length < 2) {
    return createNamespaceRegion({
      domain: hostname,
      subdomain: null,
      port: url.port ? Number(url.port) : null,
      path: splitPath(url.pathname),
      bind: readBind(url.searchParams.get('bind'), options.defaultBind),
    });
  }

  const domain = labels.slice(-2).join('.');
  const subdomain = labels.slice(0, -2).join('.') || null;

  return createNamespaceRegion({
    domain,
    subdomain,
    port: url.port ? Number(url.port) : null,
    path: splitPath(url.pathname),
    bind: readBind(url.searchParams.get('bind'), options.defaultBind),
  });
}

export function namespaceRegionToString(region: NamespaceRegion): string {
  const host = region.subdomain ? `${region.subdomain}.${region.domain}` : region.domain;
  const port = region.port == null ? '' : `:${region.port}`;
  const path = region.path.length ? `/${region.path.join('/')}` : '/';
  const bind = region.bind === 'self' ? '?bind=self' : '';
  return `${host}${port}${path}${bind}`;
}

function normalizeDomain(value: string): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeSubdomain(value: string | null): string | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || null;
}

function normalizePath(path: string[]): string[] {
  return path.map((segment) => String(segment).trim()).filter(Boolean);
}

function splitPath(pathname: string): string[] {
  return pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

function readBind(raw: string | null, fallback: NamespaceBind = 'none'): NamespaceBind {
  return raw === 'self' ? 'self' : fallback;
}
