import type { ParsedTarget } from '../types/target';
import { DEFAULT_CLEAKER_NAMESPACE_ORIGIN } from '../constants';
import type {
  RemotePointerDefinition,
  RemotePointerPayload,
  ResolvePointerOptions,
  ResolvePointerResult,
} from '../types/pointer';

export interface CreateRemotePointerOptions {
  preferredTransport?: string[];
  cacheTtl?: number;
  resolveLocalTarget?: (target: ParsedTarget) => unknown | Promise<unknown>;
}

export function createRemotePointer(
  target: ParsedTarget,
  options: CreateRemotePointerOptions = {},
): RemotePointerDefinition {
  const payload: RemotePointerPayload = {
    kind: 'remote',
    target,
    identity: {
      constant: target.namespace.constant,
      prefix: target.namespace.prefix,
    },
    intent: {
      selector: target.intent.selector,
      path: target.intent.path,
      mode: target.intent.mode,
    },
    resolution: {
      status: 'unresolved',
      namespaceRecordVerified: false,
      sessionToken: null,
      lastError: null,
    },
    operationalState: {
      latencyMs: null,
      lastSync: null,
      cacheTtl: options.cacheTtl ?? 300,
      stale: false,
    },
    transport: {
      preferred: options.preferredTransport ?? ['quic', 'https'],
      protocol: null,
      resolvedEndpoint: null,
    },
  };

  async function resolve(resolveOptions: ResolvePointerOptions = {}): Promise<ResolvePointerResult> {
    const isSovereignTarget =
      target.namespace.prefix === null &&
      (target.namespace.constant === 'local' || target.namespace.constant === 'self');
    const origin = String(resolveOptions.origin || DEFAULT_CLEAKER_NAMESPACE_ORIGIN).replace(/\/+$/, '');
    const dotPath = String(target.intent.path || '').trim().replace(/^\/+/, '');
    const endpoint = `${origin}/${dotPath}`;
    const startedAt = Date.now();

    payload.resolution.status = 'resolving';
    payload.resolution.lastError = null;
    payload.transport.protocol = isSovereignTarget ? 'local' : origin.startsWith('https://') ? 'https' : 'http';
    payload.transport.resolvedEndpoint = isSovereignTarget ? target.raw : endpoint;

    if (isSovereignTarget && options.resolveLocalTarget) {
      try {
        const value = await options.resolveLocalTarget(target);
        const elapsedMs = Date.now() - startedAt;
        payload.operationalState.latencyMs = elapsedMs;
        payload.operationalState.lastSync = Date.now();
        payload.resolution.status = 'connected';
        payload.resolution.namespaceRecordVerified = true;
        payload.operationalState.stale = false;

        return {
          ok: true,
          status: 200,
          endpoint: target.raw,
          elapsedMs,
          data: {
            ok: true,
            namespace: target.namespace.constant,
            path: target.intent.path,
            value,
          },
        };
      } catch (error) {
        const elapsedMs = Date.now() - startedAt;
        payload.operationalState.latencyMs = elapsedMs;
        payload.operationalState.lastSync = Date.now();
        payload.resolution.status = 'error';
        payload.resolution.lastError = error instanceof Error ? error.message : String(error);
        payload.operationalState.stale = false;

        return {
          ok: false,
          status: 500,
          endpoint: target.raw,
          elapsedMs,
          data: {
            ok: false,
            error: payload.resolution.lastError,
          },
        };
      }
    }

    const fetcher = resolveOptions.fetcher || fetch;
    const host = String(resolveOptions.host || target.namespace.fqdn || '').trim();
    const headers: Record<string, string> = {
      ...(resolveOptions.headers || {}),
    };
    if (host && !headers.host && !headers.Host) {
      headers.host = host;
    }

    try {
      const response = await fetcher(endpoint, {
        method: 'GET',
        headers,
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      const elapsedMs = Date.now() - startedAt;
      payload.operationalState.latencyMs = elapsedMs;
      payload.operationalState.lastSync = Date.now();

      if (response.ok) {
        payload.resolution.status = 'connected';
        payload.resolution.namespaceRecordVerified = true;
        payload.operationalState.stale = false;
      } else {
        payload.resolution.status = response.status === 401 || response.status === 403
          ? 'unauthorized'
          : 'error';
        payload.resolution.lastError = `HTTP_${response.status}`;
      }

      return {
        ok: response.ok,
        status: response.status,
        endpoint,
        elapsedMs,
        data,
      };
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      payload.operationalState.latencyMs = elapsedMs;
      payload.operationalState.lastSync = Date.now();
      payload.resolution.status = 'timeout';
      payload.resolution.lastError = error instanceof Error ? error.message : String(error);
      payload.operationalState.stale = true;

      return {
        ok: false,
        status: 0,
        endpoint,
        elapsedMs,
        data: {
          ok: false,
          error: payload.resolution.lastError,
        },
      };
    }
  }

  return { __ptr: payload, resolve };
}
