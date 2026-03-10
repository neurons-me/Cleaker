export function createNamespaceRegion(input) {
    return {
        domain: normalizeDomain(input.domain),
        subdomain: normalizeSubdomain(input.subdomain),
        port: input.port ?? null,
        path: normalizePath(input.path),
        bind: input.bind ?? 'none',
    };
}
export function parseNamespaceRegion(input, options = {}) {
    const raw = String(input ?? '').trim();
    if (!raw)
        throw new Error('Namespace region cannot be empty');
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
export function namespaceRegionToString(region) {
    const host = region.subdomain ? `${region.subdomain}.${region.domain}` : region.domain;
    const port = region.port == null ? '' : `:${region.port}`;
    const path = region.path.length ? `/${region.path.join('/')}` : '/';
    const bind = region.bind === 'self' ? '?bind=self' : '';
    return `${host}${port}${path}${bind}`;
}
function normalizeDomain(value) {
    return String(value ?? '').trim().toLowerCase();
}
function normalizeSubdomain(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized || null;
}
function normalizePath(path) {
    return path.map((segment) => String(segment).trim()).filter(Boolean);
}
function splitPath(pathname) {
    return pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}
function readBind(raw, fallback = 'none') {
    return raw === 'self' ? 'self' : fallback;
}
//# sourceMappingURL=namespaceRegion.js.map