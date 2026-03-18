export interface SemanticPath {
  raw: string;
  namespace: string | null;
  identity: string | null;
  device: string | null;
  host: string | null;
  port: number | null;
  portToken: string | null;
  protocol: string | null;
  selectors: SemanticSelectorGroup[];
  selectorRaw: string | null;
  segments: string[];
  path: string;
}

export interface SemanticSelector {
  type: string;
  value: string;
  raw: string;
}

export type SemanticSelectorGroup = SemanticSelector[];

export interface SurfaceBinding {
  kind: string;
  uri: string | null;
  capabilities: string[];
  selector?: string | null;
}

export interface TransportAddress {
  protocol: string | null;
  host: string | null;
  port: number | null;
  path: string;
  uri: string | null;
  selectorChain: string[];
  surface?: SurfaceBinding | null;
}

export interface SemanticResolveResult {
  semantic: SemanticPath;
  namespace: string | null;
  transport: TransportAddress;
  unresolved: {
    host: boolean;
    port: boolean;
    protocol: boolean;
  };
}

export interface SemanticResolverDefaults {
  namespaceRoot?: string;
  protocol?: string;
  port?: number;
  host?: string;
}

export interface SemanticResolveInput {
  raw: string;
  namespaceRoot?: string;
  defaults?: SemanticResolverDefaults;
  sources?: SemanticResolverSource[];
}

export interface SemanticResolverSource {
  resolveIdentityNamespace?: (input: {
    namespaceRoot: string | null;
    identity: string;
    selectors?: SemanticSelectorGroup[];
  }) => string | null | Promise<string | null>;
  resolveDeviceHost?: (input: {
    namespace: string | null;
    identity: string | null;
    device: string;
    selectors?: SemanticSelectorGroup[];
  }) => string | null | Promise<string | null>;
  resolvePort?: (input: {
    namespace: string | null;
    identity: string | null;
    device: string | null;
    token?: string | null;
    selectors?: SemanticSelectorGroup[];
  }) => number | null | Promise<number | null>;
  resolveProtocol?: (input: {
    namespace: string | null;
    identity: string | null;
    device: string | null;
    token?: string | null;
    selectors?: SemanticSelectorGroup[];
  }) => string | null | Promise<string | null>;
  resolveSurface?: (input: {
    namespace: string | null;
    identity: string | null;
    selectors: SemanticSelectorGroup[];
    group: SemanticSelectorGroup;
    defaults: SemanticResolverDefaults;
  }) => SurfaceBinding | null | Promise<SurfaceBinding | null>;
}

const PORT_TOKEN = 'PORT';
const DEVICE_KEYS = new Set(['device', 'host']);
const PORT_KEYS = new Set(['port']);
const PROTOCOL_KEYS = new Set(['protocol', 'transport']);

function isNamespaceToken(value: string): boolean {
  const base = splitBracketToken(value).base;
  return base.includes('.');
}

function normalizeToken(value: string): string {
  return String(value || '').trim();
}

function hasCompositeSelector(raw: string): boolean {
  const value = normalizeToken(raw);
  if (!value) return false;
  return value.includes(':') || value.includes(';') || value.includes('|') || value.includes(',');
}

function splitBracketToken(value: string): { base: string; bracket: string | null } {
  const raw = normalizeToken(value);
  if (!raw) return { base: raw, bracket: null };
  const match = raw.match(/^([^\[\]]+)(?:\[(.*)\])?$/);
  if (!match) return { base: raw, bracket: null };
  return {
    base: match[1],
    bracket: match[2] === undefined ? null : match[2],
  };
}

function splitSelectorGroups(raw: string): string[] {
  return raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseSelectorGroup(raw: string, forceTyped: boolean): SemanticSelectorGroup {
  const group: SemanticSelectorGroup = [];
  const parts = raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const colon = part.indexOf(':');
    if (colon === -1) {
      if (!forceTyped) continue;
      const value = normalizeToken(part);
      if (!value) continue;
      const type = 'device';
      group.push({ type, value, raw: `${type}:${value}` });
      continue;
    }

    const type = normalizeToken(part.slice(0, colon)).toLowerCase();
    const rest = normalizeToken(part.slice(colon + 1));
    if (!type || !rest) continue;

    const values = rest
      .split(',')
      .map((value) => normalizeToken(value))
      .filter(Boolean);

    for (const value of values) {
      group.push({ type, value, raw: `${type}:${value}` });
    }
  }

  return group;
}

function parseSelectorGroups(raw: string): SemanticSelectorGroup[] {
  const value = normalizeToken(raw);
  if (!value) return [];
  const groups = splitSelectorGroups(value);
  const forceTyped = true;
  return groups
    .map((group) => parseSelectorGroup(group, forceTyped))
    .filter((group) => group.length > 0);
}

function findSelectorValue(
  group: SemanticSelectorGroup,
  selectorType: string,
): string | null {
  const target = String(selectorType || '').trim().toLowerCase();
  if (!target) return null;
  for (const selector of group) {
    if (selector.type.toLowerCase() === target) return selector.value;
  }
  return null;
}

function normalizeWebUrl(value: string | null): string | null {
  const raw = normalizeToken(value || '');
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
}

export function createWebSurfaceSource(): SemanticResolverSource {
  return {
    resolveSurface: ({ group }) => {
      const web = findSelectorValue(group, 'web');
      if (!web) return null;
      const uri = normalizeWebUrl(web);
      if (!uri) return null;
      return {
        kind: 'web',
        uri,
        capabilities: ['read'],
        selector: `web:${web}`,
      };
    },
  };
}

function expandNamespaceShorthand(raw: string, namespaceRoot: string | null): string | null {
  if (!namespaceRoot) return null;
  const trimmed = normalizeToken(raw);
  if (!trimmed) return null;
  const sanitized = trimmed.replace(/^me:\/\//, '').replace(/^\/+/, '');
  const parts = sanitized.split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const [head, ...rest] = parts;
  const { base, bracket } = splitBracketToken(head);
  if (!base) return null;
  if (base.includes('.') || base.startsWith('@')) return null;
  const lower = base.toLowerCase();
  if (DEVICE_KEYS.has(lower) || PORT_KEYS.has(lower) || PROTOCOL_KEYS.has(lower)) return null;
  const expanded = `${base}.${namespaceRoot}`;
  const rebuiltHead = bracket === null ? expanded : `${expanded}[${bracket}]`;
  return [rebuiltHead, ...rest].join('/');
}

function isReservedHeadToken(value: string): boolean {
  const lower = value.toLowerCase();
  if (DEVICE_KEYS.has(lower) || PORT_KEYS.has(lower) || PROTOCOL_KEYS.has(lower)) return true;
  return value.toUpperCase() === PORT_TOKEN;
}

function toNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildUri(protocol: string | null, host: string | null, port: number | null, path: string): string | null {
  if (!protocol || !host) return null;
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : '';
  if (port === null) return `${protocol}://${host}${suffix}`;
  return `${protocol}://${host}:${port}${suffix}`;
}

async function resolveFromSources<T>(
  sources: SemanticResolverSource[],
  getter: (source: SemanticResolverSource) => T | null | Promise<T | null>,
): Promise<T | null> {
  for (const source of sources) {
    const value = await getter(source);
    if (value !== null && value !== undefined) return value as T;
  }
  return null;
}

export function parseSemanticPath(input: string): SemanticPath {
  const raw = normalizeToken(input);
  const sanitized = raw.replace(/^me:\/\//, '').replace(/^\/+/, '');
  const parts = sanitized.split('/').map((part) => part.trim()).filter(Boolean);

  let namespace: string | null = null;
  let identity: string | null = null;
  let device: string | null = null;
  let host: string | null = null;
  let port: number | null = null;
  let portToken: string | null = null;
  let protocol: string | null = null;
  let selectors: SemanticSelectorGroup[] = [];
  let selectorRaw: string | null = null;

  const remaining: string[] = [];
  let cursor = 0;

  if (parts[cursor]) {
    const { base, bracket } = splitBracketToken(parts[cursor]);
    const bracketHasSelectors = bracket !== null && bracket !== '' && hasCompositeSelector(bracket);
    if (bracketHasSelectors) {
      selectorRaw = bracket!;
      selectors = parseSelectorGroups(bracket!);
      const primary = selectors[0] ?? [];
      for (const selector of primary) {
        const type = selector.type.toLowerCase();
        if (type === 'device' && !device) {
          device = selector.value;
        } else if (type === 'host' && !host) {
          host = selector.value;
        } else if (PORT_KEYS.has(type) && port === null && portToken === null) {
          const parsed = toNumber(selector.value);
          if (parsed !== null) {
            port = parsed;
          } else {
            portToken = selector.value;
          }
        } else if (PROTOCOL_KEYS.has(type) && !protocol) {
          protocol = selector.value;
        }
      }
    }

    if (base && !base.startsWith('@') && !isReservedHeadToken(base)) {
      if (base.includes('.')) {
        namespace = base;
        if (bracket !== null && !bracketHasSelectors) {
          const explicitHost = normalizeToken(bracket);
          host = explicitHost ? explicitHost : null;
        }
        cursor += 1;
      } else if (bracket !== null && bracket !== '' && !bracketHasSelectors) {
        namespace = `${base}.${bracket}.me`;
        cursor += 1;
      } else {
        namespace = base;
        cursor += 1;
      }
    }
  }

  if (parts[cursor] && parts[cursor].startsWith('@')) {
    identity = parts[cursor].slice(1);
    cursor += 1;
  }

  while (cursor < parts.length) {
    const token = parts[cursor];
    const lower = token.toLowerCase();

    if (DEVICE_KEYS.has(lower)) {
      const next = parts[cursor + 1];
      if (next) {
        device = next;
        host = next;
        cursor += 2;
        continue;
      }
    }

    if (PORT_KEYS.has(lower)) {
      const next = parts[cursor + 1];
      if (next) {
        const parsed = toNumber(next);
        if (parsed !== null) {
          port = parsed;
        } else {
          portToken = next;
        }
        cursor += 2;
        continue;
      }
    }

    if (PROTOCOL_KEYS.has(lower)) {
      const next = parts[cursor + 1];
      if (next) {
        protocol = next;
        cursor += 2;
        continue;
      }
    }

    if (token.toUpperCase() === PORT_TOKEN) {
      portToken = PORT_TOKEN;
      cursor += 1;
      continue;
    }

    remaining.push(token);
    cursor += 1;
  }

  return {
    raw,
    namespace,
    identity,
    device,
    host,
    port,
    portToken,
    protocol,
    selectors,
    selectorRaw,
    segments: remaining,
    path: remaining.join('/'),
  };
}

export class SemanticResolver {
  private readonly sources: SemanticResolverSource[];
  private readonly defaults: SemanticResolverDefaults;

  constructor(sources: SemanticResolverSource[] = [], defaults: SemanticResolverDefaults = {}) {
    this.sources = sources;
    this.defaults = {
      protocol: 'me',
      ...defaults,
    };
  }

  async resolve(input: string | SemanticResolveInput): Promise<SemanticResolveResult> {
    const config = typeof input === 'string' ? { raw: input } : input;
    const defaults = {
      ...this.defaults,
      ...(config.defaults ?? {}),
    };
    const explicitNamespaceRoot = config.namespaceRoot ?? defaults.namespaceRoot ?? null;
    let semantic = parseSemanticPath(config.raw);
    if (!semantic.namespace && explicitNamespaceRoot) {
      const expanded = expandNamespaceShorthand(semantic.raw, explicitNamespaceRoot);
      if (expanded) semantic = parseSemanticPath(expanded);
    }
    const sources = config.sources ?? this.sources;
    const namespaceRoot = explicitNamespaceRoot ?? semantic.namespace ?? null;

    const resolvedNamespace =
      semantic.identity && namespaceRoot
        ? await resolveFromSources(sources, (source) =>
            source.resolveIdentityNamespace?.({
              namespaceRoot,
              identity: semantic.identity!,
              selectors: semantic.selectors,
            }),
          ) ?? `${semantic.identity}.${namespaceRoot}`
        : semantic.namespace ?? namespaceRoot;

    const selectorGroups = semantic.selectors.length > 0 ? semantic.selectors : [[]];
    let resolvedHost: string | null = null;
    let resolvedPort: number | null = null;
    let resolvedProtocol: string | null = null;
    let selectorChain: string[] = [];
    let transportHost: string | null = null;
    let selectedGroup: SemanticSelectorGroup = [];
    let unresolvedHost = true;
    let unresolvedPort = true;
    let unresolvedProtocol = true;

    const resolveGroup = async (group: SemanticSelectorGroup) => {
      let deviceOverride: string | null = null;
      let hostOverride: string | null = null;
      let portOverride: number | null = null;
      let portTokenOverride: string | null = null;
      let protocolOverride: string | null = null;

      for (const selector of group) {
        const type = selector.type.toLowerCase();
        if (type === 'device') {
          deviceOverride = selector.value;
        } else if (type === 'host') {
          hostOverride = selector.value;
        } else if (PORT_KEYS.has(type)) {
          const parsed = toNumber(selector.value);
          if (parsed !== null) {
            portOverride = parsed;
            portTokenOverride = null;
          } else {
            portTokenOverride = selector.value;
          }
        } else if (PROTOCOL_KEYS.has(type)) {
          protocolOverride = selector.value;
        }
      }

      const deviceValue = deviceOverride ?? semantic.device;
      const hostValue = hostOverride ?? semantic.host;
      const portValue = portOverride ?? semantic.port;
      const portTokenValue = portTokenOverride ?? semantic.portToken;
      const protocolValue = protocolOverride ?? semantic.protocol;

      const hostResolved =
        hostValue ??
        (deviceValue
          ? await resolveFromSources(sources, (source) =>
              source.resolveDeviceHost?.({
                namespace: resolvedNamespace,
                identity: semantic.identity,
                device: deviceValue!,
                selectors: semantic.selectors,
              }),
            )
          : null) ??
        defaults.host ??
        null;

      const portResolved =
        portValue ??
        (portTokenValue || deviceValue
          ? await resolveFromSources(sources, (source) =>
              source.resolvePort?.({
                namespace: resolvedNamespace,
                identity: semantic.identity,
                device: deviceValue,
                token: portTokenValue,
                selectors: semantic.selectors,
              }),
            )
          : null) ??
        defaults.port ??
        null;

      const protocolResolved =
        protocolValue ??
        await resolveFromSources(sources, (source) =>
          source.resolveProtocol?.({
            namespace: resolvedNamespace,
            identity: semantic.identity,
            device: deviceValue,
            token: portTokenValue,
            selectors: semantic.selectors,
          }),
        ) ??
        defaults.protocol ??
        null;

      const groupSelectors = group.map((selector) => selector.raw);
      const hasDeviceSelector = group.some((selector) => DEVICE_KEYS.has(selector.type.toLowerCase()));
      const selectorLabelParts = [...groupSelectors];
      if (!hasDeviceSelector && deviceValue) {
        selectorLabelParts.push(`device:${deviceValue}`);
      }

      const selectorLabel = selectorLabelParts.length > 0 ? selectorLabelParts.join(';') : null;
      const protocolLabel = protocolResolved ? protocolResolved.toLowerCase() : null;
      const wantsBinding = !!deviceValue || !!hostValue || selectorLabelParts.length > 0;
      const transport =
        protocolLabel === 'me'
          ? resolvedNamespace
            ? wantsBinding
              ? selectorLabel
                ? `${resolvedNamespace}[${selectorLabel}]`
                : hostResolved
                  ? `${resolvedNamespace}[${hostResolved}]`
                  : null
              : resolvedNamespace
            : null
          : hostResolved;

      const chain = groupSelectors.length > 0
        ? [
            protocolResolved,
            ...groupSelectors,
            portResolved !== null ? String(portResolved) : null,
          ].filter(Boolean)
        : [
            protocolResolved,
            deviceValue,
            hostResolved && hostResolved !== deviceValue ? hostResolved : null,
            portResolved !== null ? String(portResolved) : null,
          ].filter(Boolean);

      const unresolved = {
        host: !transport,
        port: portResolved === null,
        protocol: !protocolResolved,
      };

      return {
        host: hostResolved,
        port: portResolved,
        protocol: protocolResolved,
        transport,
        chain,
        unresolved,
      };
    };

    let bestScore = Number.POSITIVE_INFINITY;
    for (const group of selectorGroups) {
      const candidate = await resolveGroup(group);
      const score =
        (candidate.unresolved.host ? 1 : 0) +
        (candidate.unresolved.port ? 1 : 0) +
        (candidate.unresolved.protocol ? 1 : 0);
      if (score < bestScore) {
        bestScore = score;
        resolvedHost = candidate.host;
        resolvedPort = candidate.port;
        resolvedProtocol = candidate.protocol;
        transportHost = candidate.transport;
        selectorChain = candidate.chain as string[];
        selectedGroup = group;
        unresolvedHost = candidate.unresolved.host;
        unresolvedPort = candidate.unresolved.port;
        unresolvedProtocol = candidate.unresolved.protocol;
      }
      if (score === 0) break;
    }

    const surface =
      await resolveFromSources(sources, (source) =>
        source.resolveSurface?.({
          namespace: resolvedNamespace ?? null,
          identity: semantic.identity,
          selectors: semantic.selectors,
          group: selectedGroup,
          defaults,
        }),
      );

    const transport: TransportAddress = {
      protocol: resolvedProtocol,
      host: transportHost,
      port: resolvedPort,
      path: semantic.path,
      uri: buildUri(resolvedProtocol, transportHost, resolvedPort, semantic.path),
      selectorChain,
      surface: surface ?? undefined,
    };

    return {
      semantic,
      namespace: resolvedNamespace ?? null,
      transport,
      unresolved: {
        host: unresolvedHost,
        port: unresolvedPort,
        protocol: unresolvedProtocol,
      },
    };
  }
}
