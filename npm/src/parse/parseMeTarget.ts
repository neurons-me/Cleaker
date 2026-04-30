import { CleakerParseError } from '../protocol/errors';
import {
  CONTEXT_AND_SEPARATOR,
  CONTEXT_BRANCH_SEPARATOR,
  CONTEXT_OPEN,
  CONTEXT_CLOSE,
  CONTEXT_VALUE_SEPARATOR,
  ME_SCHEME,
} from './grammar';
import type {
  MeTargetContextAtom,
  MeTargetContextClause,
  MeTargetContextSet,
  ParseTargetOptions,
  ParsedTarget,
} from '../types/target';

function normalizeInput(input: string): string {
  const raw = String(input ?? '').trim();
  if (!raw) throw new CleakerParseError('Target cannot be empty');
  return raw;
}

function stripScheme(raw: string): string {
  if (raw.startsWith(ME_SCHEME)) return raw.slice(ME_SCHEME.length);
  return raw;
}

function findTokenOutsideContext(input: string, token: string, start = 0): number {
  let depth = 0;
  for (let index = start; index < input.length; index += 1) {
    const char = input[index];
    if (char === CONTEXT_OPEN) {
      depth += 1;
      continue;
    }
    if (char === CONTEXT_CLOSE) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && char === token) return index;
  }
  return -1;
}

function ensureBalancedContext(input: string): void {
  let depth = 0;
  for (const char of input) {
    if (char === CONTEXT_OPEN) depth += 1;
    if (char === CONTEXT_CLOSE) depth -= 1;
    if (depth < 0) {
      throw new CleakerParseError('Target has an unexpected closing context bracket', { raw: input });
    }
  }
  if (depth !== 0) {
    throw new CleakerParseError('Target has an unclosed context bracket', { raw: input });
  }
}

function expandClauseWithAtom(
  clauses: MeTargetContextClause[],
  atomKey: string,
  values: string[],
): MeTargetContextClause[] {
  const next: MeTargetContextClause[] = [];
  for (const clause of clauses) {
    for (const value of values) {
      next.push([
        ...clause,
        {
          key: atomKey,
          value,
          raw: `${atomKey}:${value}`,
        },
      ]);
    }
  }
  return next;
}

function parseContext(raw: string | null): MeTargetContextSet {
  const value = String(raw ?? '').trim();
  if (!value) return [];

  const groups = value
    .split(CONTEXT_BRANCH_SEPARATOR)
    .map((group) => group.trim())
    .filter(Boolean);

  const clauses: MeTargetContextSet = [];
  for (const group of groups) {
    const parts = group
      .split(CONTEXT_AND_SEPARATOR)
      .map((part) => part.trim())
      .filter(Boolean);

    let expanded: MeTargetContextClause[] = [[]];
    for (const part of parts) {
      const colon = part.indexOf(':');
      if (colon < 0) {
        throw new CleakerParseError('Context atoms must match key:value', { raw: part });
      }

      const key = part.slice(0, colon).trim().toLowerCase();
      const rest = part.slice(colon + 1).trim();
      if (!key || !rest) {
        throw new CleakerParseError('Context atoms must match key:value', { raw: part });
      }

      const values = rest
        .split(CONTEXT_VALUE_SEPARATOR)
        .map((item) => item.trim())
        .filter(Boolean);

      if (values.length === 0) {
        throw new CleakerParseError('Context atoms must include at least one value', { raw: part });
      }

      expanded = expandClauseWithAtom(expanded, key, values);
    }

    clauses.push(...expanded);
  }

  return clauses;
}

function extractNamespaceParts(namespaceToken: string): {
  base: string;
  contextRaw: string | null;
  context: MeTargetContextSet;
} {
  const trimmed = String(namespaceToken || '').trim();
  if (!trimmed) {
    throw new CleakerParseError('Namespace cannot be empty', { raw: namespaceToken });
  }

  const openIndex = trimmed.indexOf(CONTEXT_OPEN);
  if (openIndex < 0) {
    return {
      base: trimmed,
      contextRaw: null,
      context: [],
    };
  }

  const closeIndex = trimmed.lastIndexOf(CONTEXT_CLOSE);
  if (closeIndex !== trimmed.length - 1 || closeIndex < openIndex) {
    throw new CleakerParseError('Namespace context must appear at the end of the namespace', {
      raw: namespaceToken,
    });
  }

  const base = trimmed.slice(0, openIndex).trim();
  const contextRaw = trimmed.slice(openIndex + 1, closeIndex).trim();
  if (!base) {
    throw new CleakerParseError('Namespace cannot be empty', { raw: namespaceToken });
  }

  return {
    base,
    contextRaw,
    context: parseContext(contextRaw),
  };
}

function deriveCompatibilityNamespace(base: string) {
  const segments = base
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const head = segments[0] || base;
  const labels = head.split('.').filter(Boolean);

  if (labels.length === 0) {
    throw new CleakerParseError('Namespace is missing constant', { raw: base });
  }

  const constant = labels[labels.length - 1];
  const prefix = labels.length > 1 ? labels.slice(0, -1).join('.') : null;

  return {
    segments,
    constant,
    prefix,
  };
}

function stringifyContext(context: MeTargetContextSet): string | null {
  if (!Array.isArray(context) || context.length === 0) return null;
  return context
    .map((clause) => clause.map((atom) => `${atom.key}:${atom.value}`).join(CONTEXT_AND_SEPARATOR))
    .join(CONTEXT_BRANCH_SEPARATOR);
}

export function stringifyMeTarget(target: Pick<ParsedTarget, 'namespace' | 'operation' | 'path'>): string {
  const namespace = String(target.namespace.fqdn || '').trim();
  if (!namespace) throw new CleakerParseError('Namespace cannot be empty');

  const operation = String(target.operation || '').trim();
  if (!operation) throw new CleakerParseError('Operation cannot be empty');

  const path = String(target.path || '').trim().replace(/^\/+/, '');
  if (!path) throw new CleakerParseError('Path cannot be empty');

  const context = stringifyContext(target.namespace.context);
  const namespaceToken = context ? `${namespace}[${context}]` : namespace;

  return `${ME_SCHEME}${namespaceToken}:${operation}/${path}`;
}

export function parseMeTarget(input: string, options: ParseTargetOptions = {}): ParsedTarget {
  const raw = normalizeInput(input);
  ensureBalancedContext(raw);

  const body = stripScheme(raw).replace(/^\/+/, '').trim();
  if (!body) throw new CleakerParseError('Target cannot be empty');

  const operationSeparator = findTokenOutsideContext(body, ':');
  const operationMissing = operationSeparator < 0;
  if (operationMissing && !options.allowShorthandRead) {
    throw new CleakerParseError('Target must match namespace[context]:operation/path', { raw });
  }

  const pathSeparator = operationMissing
    ? findTokenOutsideContext(body, '/')
    : findTokenOutsideContext(body, '/', operationSeparator + 1);

  if (pathSeparator < 0) {
    throw new CleakerParseError('Path cannot be empty', { raw });
  }

  const namespaceToken = body.slice(0, operationMissing ? pathSeparator : operationSeparator).trim();
  const operationToken = operationMissing
    ? 'read'
    : body.slice(operationSeparator + 1, pathSeparator).trim();
  const path = body.slice(pathSeparator + 1).trim().replace(/^\/+/, '');

  if (!namespaceToken) throw new CleakerParseError('Namespace cannot be empty', { raw });
  if (!operationToken) throw new CleakerParseError('Operation cannot be empty', { raw });
  if (!path) throw new CleakerParseError('Path cannot be empty', { raw });

  const namespace = extractNamespaceParts(namespaceToken);
  const compatibility = deriveCompatibilityNamespace(namespace.base.toLowerCase());

  const parsed: ParsedTarget = {
    scheme: 'me',
    raw: '',
    namespace: {
      prefix: compatibility.prefix,
      constant: compatibility.constant,
      fqdn: namespace.base,
      segments: compatibility.segments,
      contextRaw: namespace.contextRaw,
      context: namespace.context,
    },
    intent: {
      selector: operationToken,
      path,
      mode: options.defaultMode ?? 'reactive',
    },
    operation: operationToken,
    path,
  };

  parsed.raw = stringifyMeTarget(parsed);
  return parsed;
}
