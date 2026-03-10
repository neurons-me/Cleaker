import {
  createNamespaceRegion,
  namespaceRegionToString,
  parseNamespaceRegion,
  type NamespaceRegion,
} from '../algebra';
import type { ParsedBrowserNamespace } from '../types/browser';
import { parseTarget } from './parseTarget';

export interface ParseBrowserNamespaceOptions {
  localPrefixes?: string[];
}

const DEFAULT_LOCAL_PREFIXES = ['docs', 'assets'];

export function parseBrowserNamespace(
  input: string,
  options: ParseBrowserNamespaceOptions = {},
): ParsedBrowserNamespace {
  const raw = String(input ?? '').trim();
  if (!raw) throw new Error('Browser namespace cannot be empty');

  const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  const bind = url.searchParams.get('bind') === 'self' ? 'self' : 'none';
  const hostRegion = createNamespaceRegion({
    ...parseNamespaceRegion(`${url.origin}/`),
    bind,
  });

  const localPrefixes = options.localPrefixes ?? DEFAULT_LOCAL_PREFIXES;
  const pathSegments = splitPath(url.pathname);
  const semanticPath = url.pathname.replace(/^\/+/, '');

  if (semanticPath) {
    try {
      const target = parseTarget(semanticPath);
      return {
        kind: 'nrp',
        raw,
        hostRegion,
        target,
        bind,
      };
    } catch {
      // Fall through to local or regional parsing.
    }
  }

  if (pathSegments.length > 0 && localPrefixes.includes(pathSegments[0])) {
    return {
      kind: 'local',
      raw,
      hostRegion,
      localPath: pathSegments,
    };
  }

  const targetRegion = createNamespaceRegion({
    ...hostRegion,
    path: pathSegments,
    bind,
  });

  if (bind === 'self') {
    return {
      kind: 'relation',
      raw,
      hostRegion,
      targetRegion,
      viewerBinding: 'self',
    };
  }

  return {
    kind: 'existence',
    raw,
    hostRegion,
    targetRegion,
  };
}

export function browserNamespaceToString(parsed: ParsedBrowserNamespace): string {
  if (parsed.kind === 'nrp') {
    const bind = parsed.bind === 'self' ? '?bind=self' : '';
    return `${namespaceRegionToString({ ...parsed.hostRegion, path: [], bind: 'none' }).replace(/\/$/, '')}/${parsed.target.raw.replace(/^nrp:\/\//, '')}${bind}`;
  }

  if (parsed.kind === 'local') {
    const bind = parsed.hostRegion.bind === 'self' ? '?bind=self' : '';
    return `${namespaceRegionToString({ ...parsed.hostRegion, path: [], bind: 'none' }).replace(/\/$/, '')}/${parsed.localPath.join('/')}${bind}`;
  }

  return namespaceRegionToString(parsed.targetRegion);
}

function splitPath(pathname: string): string[] {
  return pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}
