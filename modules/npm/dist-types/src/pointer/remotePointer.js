export function createRemotePointer(target, options = {}) {
    const payload = {
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
    async function resolve(resolveOptions = {}) {
        const origin = String(resolveOptions.origin || 'http://localhost:8161').replace(/\/+$/, '');
        const dotPath = String(target.intent.path || '').trim().replace(/^\/+/, '');
        const endpoint = `${origin}/${dotPath}`;
        const startedAt = Date.now();
        payload.resolution.status = 'resolving';
        payload.resolution.lastError = null;
        payload.transport.protocol = origin.startsWith('https://') ? 'https' : 'http';
        payload.transport.resolvedEndpoint = endpoint;
        const fetcher = resolveOptions.fetcher || fetch;
        const host = String(resolveOptions.host || target.namespace.fqdn || '').trim();
        const headers = {
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
            let data = null;
            try {
                data = await response.json();
            }
            catch {
                data = await response.text();
            }
            const elapsedMs = Date.now() - startedAt;
            payload.operationalState.latencyMs = elapsedMs;
            payload.operationalState.lastSync = Date.now();
            if (response.ok) {
                payload.resolution.status = 'connected';
                payload.resolution.namespaceRecordVerified = true;
                payload.operationalState.stale = false;
            }
            else {
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
        }
        catch (error) {
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
//# sourceMappingURL=remotePointer.js.map