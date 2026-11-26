// position.ts -- where you ARE: `namespace @ surface`, with the surface written as the exact place the page is.
//
// The namespace is what you are in; the surface is where you are looking from. They stay apart (Ax4): the surface never
// changes the namespace and never authorizes anything.
//
// The surface is the FULL place, not a summary: host + path + query + fragment. Everything that tells two places apart is
// kept, because a place has to be returnable to -- a highlight on one section of one page, shared with someone, must
// lead them back to exactly there (`es.wikipedia.org/wiki/Pastor_alemán#Historia`). Long strings are for the display to
// shorten (QR.me trims the middle of a long label); the value itself is never shortened.
//
// Written as the grammar writes a surface:
//   * bare (`neurons-me.github.io/Cleaker`) when the scheme is the usual one: https, or http on a loopback host;
//   * quoted with its scheme (`"http://cleaker.me/x"`) when the scheme is news (http on a non-loopback host), when the
//     caller needs it (`forceScheme`: the scheme is the reason the page is not bound), or for an IPv6 literal;
//   * a file is a place on this device: `page.html` compact, `"file:///Users/me/page.html"` in full.
// Only noise is dropped: a trailing `/` and a trailing `index.html` (the same document); the root of a site is the host
// alone. The path's own spelling is kept (as the address bar shows it).

/** The parts of a page's location this needs (window.location, a URL, or a plain object). */
export type PagePlace = {
  protocol: string;
  host: string;
  pathname?: string;
  search?: string;
  hash?: string;
};

export type Surface = {
  /** For drawing: bare when the scheme is the usual one, quoted with it when not. */
  compact: string;
  /** Exact and unambiguous, for copying or resolving: always quoted, scheme included. */
  full: string;
};

export type Position = {
  namespace: string;
  /** The surface, compact ('' when there is no page). */
  surface: string;
  /** `namespace @ surface` (just the namespace when there is no page). */
  expression: string;
  /** `namespace @ "scheme://place"`: exact, for copying or resolving. */
  full: string;
};

const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|[^.:\s]+\.localhost)(?::\d+)?$/i;

function schemeOf(page: PagePlace): string {
  return String(page.protocol || 'http:').toLowerCase().replace(/:?$/, ':');
}

/** The path as the place writes it: no trailing slash, no trailing index.html; the root is ''. */
export function placePath(pathname: string | undefined): string {
  return String(pathname || '').replace(/\/index\.html?$/i, '/').replace(/\/+$/, '');
}

/** A page opened as a file has no host: its place is the file on this device. */
function fileSurface(page: PagePlace): Surface | null {
  if (schemeOf(page) !== 'file:') return null;
  const path = String(page.pathname || '');
  if (!path || path === '/') return { compact: 'file://', full: '"file:///"' };
  const segments = path.split('/').filter(Boolean);
  let name = segments[segments.length - 1] || '';
  try { name = decodeURIComponent(name); } catch { /* keep it as written */ }
  return { compact: name || 'file://', full: `"file://${path}"` };
}

/** The exact place of a page, as a surface. `null` when there is no page (or no host and not a file). */
export function surfaceOf(page: PagePlace | null | undefined, options: { forceScheme?: boolean } = {}): Surface | null {
  if (!page) return null;
  const file = fileSurface(page);
  if (file) return options.forceScheme ? { compact: file.full, full: file.full } : file;
  const host = String(page.host || '').trim().toLowerCase();
  if (!host) return null;
  const place = `${host}${placePath(page.pathname)}${String(page.search || '')}${String(page.hash || '')}`;
  const scheme = schemeOf(page);
  const full = `"${scheme}//${place}"`;
  const schemeIsNews = scheme === 'http:' && !LOOPBACK.test(host);
  const compact = options.forceScheme || schemeIsNews || host.startsWith('[') ? full : place;
  return { compact, full };
}

/** `namespace @ surface`, the surface being the exact place of `page`. */
export function positionOf(namespace: string, page: PagePlace | null | undefined): Position {
  const ns = String(namespace || '').trim();
  const surface = surfaceOf(page);
  if (!surface) return { namespace: ns, surface: '', expression: ns, full: ns };
  return {
    namespace: ns,
    surface: surface.compact,
    expression: ns ? `${ns} @ ${surface.compact}` : surface.compact,
    full: ns ? `${ns} @ ${surface.full}` : surface.full,
  };
}

/** The current page's location, when there is one (a browser); `null` elsewhere (Node, a worker without location). */
export function currentPage(): PagePlace | null {
  try {
    const loc = (globalThis as { location?: PagePlace }).location;
    return loc && typeof loc.protocol === 'string' ? loc : null;
  } catch {
    return null;
  }
}
