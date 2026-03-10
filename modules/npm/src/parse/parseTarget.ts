import { CleakerParseError } from '../protocol/errors';
import { NRP_SCHEME, TARGET_RE } from './grammar';
import type { ParseTargetOptions, ParsedTarget } from '../types/target';

export function parseTarget(input: string, options: ParseTargetOptions = {}): ParsedTarget {
  const raw = String(input ?? '').trim();
  if (!raw) throw new CleakerParseError('Target cannot be empty');

  const match = raw.match(TARGET_RE);
  if (!match?.groups) {
    throw new CleakerParseError('Target must match [prefix.]constant:selector/path', { raw });
  }

  const ns = match.groups.ns.trim().toLowerCase();
  const selector = match.groups.selector.trim();
  const path = match.groups.path.trim().replace(/^\/+/, '');

  const labels = ns.split('.').filter(Boolean);
  if (labels.length === 0) throw new CleakerParseError('Namespace is missing constant', { raw });

  const constant = labels[labels.length - 1];
  const prefix = labels.length > 1 ? labels.slice(0, -1).join('.') : null;

  if (!selector) throw new CleakerParseError('Selector cannot be empty', { raw });
  if (!path) throw new CleakerParseError('Path cannot be empty', { raw });

  return {
    scheme: 'nrp',
    raw: raw.startsWith(NRP_SCHEME) ? raw : `${NRP_SCHEME}${raw}`,
    namespace: {
      prefix,
      constant,
      fqdn: ns,
    },
    intent: {
      selector,
      path,
      mode: options.defaultMode ?? 'reactive',
    },
  };
}
