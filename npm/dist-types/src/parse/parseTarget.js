import { CleakerParseError } from '../protocol/errors';
import { LEGACY_NRP_SCHEME, ME_SCHEME, TARGET_RE } from './grammar';
export function parseTarget(input, options = {}) {
    const raw = String(input ?? '').trim();
    if (!raw)
        throw new CleakerParseError('Target cannot be empty');
    const match = raw.match(TARGET_RE);
    if (!match?.groups) {
        throw new CleakerParseError('Target must match [prefix.]constant:selector/path', { raw });
    }
    const ns = match.groups.ns.trim().toLowerCase();
    const selector = match.groups.selector.trim();
    const path = match.groups.path.trim().replace(/^\/+/, '');
    const labels = ns.split('.').filter(Boolean);
    if (labels.length === 0)
        throw new CleakerParseError('Namespace is missing constant', { raw });
    const constant = labels[labels.length - 1];
    const prefix = labels.length > 1 ? labels.slice(0, -1).join('.') : null;
    if (!selector)
        throw new CleakerParseError('Selector cannot be empty', { raw });
    if (!path)
        throw new CleakerParseError('Path cannot be empty', { raw });
    return {
        scheme: 'me',
        raw: raw.startsWith(ME_SCHEME)
            ? raw
            : raw.startsWith(LEGACY_NRP_SCHEME)
                ? `${ME_SCHEME}${raw.slice(LEGACY_NRP_SCHEME.length)}`
                : `${ME_SCHEME}${raw}`,
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
//# sourceMappingURL=parseTarget.js.map