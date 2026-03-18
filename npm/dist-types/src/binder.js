import { parseTarget } from './parse/parseTarget';
import { createRemotePointer } from './pointer/remotePointer';
function normalizeReplayMemory(memory) {
    if (!memory || typeof memory !== 'object')
        return memory;
    const record = memory;
    const payload = record.payload;
    const source = payload && typeof payload === 'object'
        ? payload
        : record;
    const merged = {
        ...source,
    };
    // Server write payloads use `expression` as the written dot-path.
    // `.me` replay expects semantic memories shaped as `{ path, operator, expression, value }`.
    if (!Object.prototype.hasOwnProperty.call(merged, 'path')) {
        const rawExpression = String(merged.expression || '').trim();
        if (rawExpression) {
            merged.path = rawExpression;
        }
    }
    if (!Object.prototype.hasOwnProperty.call(merged, 'operator')) {
        merged.operator = null;
    }
    if (Object.prototype.hasOwnProperty.call(merged, 'value')) {
        merged.expression = merged.value;
    }
    if (!Object.prototype.hasOwnProperty.call(merged, 'timestamp') && record.timestamp !== undefined) {
        merged.timestamp = record.timestamp;
    }
    if (!Object.prototype.hasOwnProperty.call(merged, 'identityHash') && record.identityHash !== undefined) {
        merged.identityHash = record.identityHash;
    }
    return merged;
}
function stableStringify(value) {
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map((v) => stableStringify(v)).join(',')}]`;
    const obj = value;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}
function hashMemory(memory) {
    const m = (memory ?? {});
    const explicit = String(m.hash || '').trim();
    if (explicit)
        return `h:${explicit}`;
    const ts = Number(m.timestamp || 0);
    return `v:${ts}:${stableStringify(memory)}`;
}
function normalizeOrigin(origin) {
    const raw = String(origin || '').trim();
    if (!raw)
        return '';
    const withScheme = raw.includes('://') ? raw : `http://${raw}`;
    try {
        const url = new URL(withScheme.endsWith('/') ? withScheme : `${withScheme}/`);
        return url.origin.toLowerCase();
    }
    catch {
        return raw.replace(/\/+$/, '').toLowerCase();
    }
}
function hashFn(input) {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}
function computeHostId(origin) {
    return hashFn(normalizeOrigin(origin));
}
function readKernelPath(me, segments) {
    if (!segments.length)
        return undefined;
    try {
        let ref = me;
        for (let i = 0; i < segments.length; i += 1) {
            ref = ref?.[segments[i]];
            if (ref == null)
                return undefined;
        }
        if (typeof ref === 'function') {
            try {
                return ref();
            }
            catch {
                return undefined;
            }
        }
        return ref;
    }
    catch {
        return undefined;
    }
}
function writeKernelPath(me, segments, value) {
    if (!segments.length)
        return false;
    try {
        let ref = me;
        for (let i = 0; i < segments.length; i += 1) {
            ref = ref?.[segments[i]];
            if (ref == null)
                return false;
        }
        if (typeof ref === 'function') {
            ref(value);
            return true;
        }
    }
    catch {
        return false;
    }
    return false;
}
function toHostRecord(input, namespace) {
    const origin = normalizeOrigin(String(input.origin || ''));
    if (!origin)
        return null;
    const id = String(input.id || '').trim() || computeHostId(origin);
    const baseStatus = input.status || {
        transport: 'unknown',
        triad: 'unverified',
        latencyMs: 0,
        lastSeen: 0,
    };
    const baseCapabilities = input.capabilities || {
        canClaim: false,
        canOpen: true,
        canRelay: false,
    };
    return {
        id,
        alias: input.alias ? String(input.alias) : undefined,
        origin,
        namespace,
        status: {
            transport: baseStatus.transport || 'unknown',
            triad: baseStatus.triad || 'unverified',
            latencyMs: Number(baseStatus.latencyMs || 0),
            lastSeen: Number(baseStatus.lastSeen || 0),
        },
        capabilities: {
            canClaim: !!baseCapabilities.canClaim,
            canOpen: baseCapabilities.canOpen !== false,
            canRelay: !!baseCapabilities.canRelay,
        },
        error: input.error ? String(input.error) : undefined,
    };
}
function defaultDetectRemote(path) {
    const joined = path.join('.').trim();
    if (joined.includes('.cleaker:') || joined.includes(':'))
        return true;
    return path.some((segment, index) => {
        const normalized = segment.toLowerCase();
        return (normalized.includes('cleaker:') ||
            normalized.includes(':') ||
            (normalized === 'cleaker' && index < path.length - 1));
    });
}
function defaultMapToExpression(inputPath) {
    const path = inputPath.map((x) => String(x || '').trim()).filter(Boolean);
    if (path.length === 0)
        return null;
    const joined = path.join('.');
    if (joined.includes(':'))
        return joined;
    const cleakerIx = path.findIndex((segment) => segment.toLowerCase() === 'cleaker');
    if (cleakerIx > 0 && cleakerIx < path.length - 1) {
        const prefix = path[cleakerIx - 1];
        const rest = path.slice(cleakerIx + 1).join('.');
        return `${prefix}.cleaker:read/${rest || 'profile'}`;
    }
    return null;
}
function unwrapResolvedValue(data) {
    if (!data || typeof data !== 'object')
        return data;
    const record = data;
    if (Object.prototype.hasOwnProperty.call(record, 'value'))
        return record.value;
    return data;
}
function tryReadLocal(me, path) {
    if (path.length === 0 || typeof me !== 'function')
        return undefined;
    try {
        return me(path.join('.'));
    }
    catch {
        return undefined;
    }
}
function tryInvokeKernelPath(me, path, args) {
    if (typeof me !== 'function')
        return undefined;
    try {
        if (path.length === 0) {
            return me(...args);
        }
        let ref = me;
        for (const part of path) {
            ref = ref?.[part];
        }
        if (typeof ref === 'function') {
            return ref(...args);
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
export function bindKernel(me, options = {}) {
    const hydratedMemoryHashes = new Set();
    const hydratedMemories = [];
    const remoteOverlay = new Map();
    const remoteSlots = new Map();
    const listeners = new Map();
    const defaultNamespace = String(options.namespace || '').trim();
    const defaultSecret = String(options.secret || '');
    const bootstrapOrigins = Array.isArray(options.bootstrap)
        ? options.bootstrap.map((origin) => normalizeOrigin(origin)).filter(Boolean)
        : [];
    let currentState = 'idle';
    let currentCycleId = 0;
    let lastStatus = {
        cycleId: 0,
        state: 'idle',
        overall: bootstrapOrigins.length ? 'degraded' : 'offline',
        activeNamespace: defaultNamespace,
        totalHosts: 0,
        verifiedHosts: 0,
        hosts: [],
    };
    let lastReadyPayload = null;
    // Triad auto-open: if namespace + secret are provided at bind time, open immediately in the background.
    let _ready = Promise.resolve(null);
    let resolverConfig = {
        detectRemote: defaultDetectRemote,
        mapToExpression: defaultMapToExpression,
        applyResult: (result, path) => unwrapResolvedValue(result),
        resolveOptions: {},
    };
    function resolveBoundKernelTarget(path) {
        const normalized = String(path || '').trim().replace(/^\/+/, '').replace(/\//g, '.');
        if (!normalized)
            return undefined;
        return tryReadLocal(me, normalized.split('.').filter(Boolean));
    }
    function emit(eventName, ...args) {
        const handlers = listeners.get(eventName);
        if (!handlers || handlers.size === 0)
            return;
        handlers.forEach((handler) => {
            try {
                handler(...args);
            }
            catch {
                // Never let observers break runtime lifecycle.
            }
        });
    }
    function on(eventName, handler) {
        const set = listeners.get(eventName) || new Set();
        set.add(handler);
        listeners.set(eventName, set);
        return () => off(eventName, handler);
    }
    function off(eventName, handler) {
        const set = listeners.get(eventName);
        if (!set)
            return;
        set.delete(handler);
        if (set.size === 0)
            listeners.delete(eventName);
    }
    function once(eventName, handler) {
        const unsubscribe = on(eventName, ((...args) => {
            unsubscribe();
            handler(...args);
        }));
        return unsubscribe;
    }
    function transition(nextState, cycleId) {
        currentState = nextState;
        lastStatus = {
            ...lastStatus,
            cycleId,
            state: nextState,
        };
        emit('status:change', getStatus());
    }
    function persistHostRecord(namespace, host) {
        const base = ['namespaces', namespace, 'registry', 'hosts', host.id];
        writeKernelPath(me, [...base, 'id'], host.id);
        writeKernelPath(me, [...base, 'alias'], host.alias || '');
        writeKernelPath(me, [...base, 'origin'], host.origin);
        writeKernelPath(me, [...base, 'namespace'], host.namespace);
        writeKernelPath(me, [...base, 'status', 'transport'], host.status.transport);
        writeKernelPath(me, [...base, 'status', 'triad'], host.status.triad);
        writeKernelPath(me, [...base, 'status', 'latencyMs'], host.status.latencyMs);
        writeKernelPath(me, [...base, 'status', 'lastSeen'], host.status.lastSeen);
        writeKernelPath(me, [...base, 'capabilities', 'canClaim'], host.capabilities.canClaim);
        writeKernelPath(me, [...base, 'capabilities', 'canOpen'], host.capabilities.canOpen);
        writeKernelPath(me, [...base, 'capabilities', 'canRelay'], host.capabilities.canRelay);
        writeKernelPath(me, [...base, 'error'], host.error || '');
    }
    function discoverHosts(input = {}) {
        const namespace = String(input.namespace || defaultNamespace || '').trim();
        if (!namespace)
            return [];
        const hostMap = new Map();
        const rawRegistry = readKernelPath(me, ['namespaces', namespace, 'registry', 'hosts']);
        if (rawRegistry && typeof rawRegistry === 'object' && !Array.isArray(rawRegistry)) {
            const registry = rawRegistry;
            Object.keys(registry).forEach((key) => {
                const candidate = registry[key];
                const parsed = toHostRecord({
                    ...candidate,
                    id: candidate?.id || key,
                }, namespace);
                if (parsed)
                    hostMap.set(parsed.id, parsed);
            });
        }
        if (hostMap.size === 0) {
            const runtimeBootstrap = Array.isArray(input.bootstrap)
                ? input.bootstrap.map((origin) => normalizeOrigin(origin)).filter(Boolean)
                : [];
            const fallbackOrigins = [normalizeOrigin(options.origin || ''), ...bootstrapOrigins, ...runtimeBootstrap].filter(Boolean);
            fallbackOrigins.forEach((origin) => {
                const host = toHostRecord({ origin }, namespace);
                if (!host)
                    return;
                hostMap.set(host.id, host);
                persistHostRecord(namespace, host);
            });
        }
        return Array.from(hostMap.values());
    }
    async function ping(origin, timeoutMs, fetcher) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        try {
            const response = await fetcher(`${normalizeOrigin(origin)}/__bootstrap`, {
                method: 'GET',
                cache: 'no-store',
                signal: controller?.signal,
            });
            return response.ok;
        }
        catch {
            return false;
        }
        finally {
            if (timeoutId)
                clearTimeout(timeoutId);
        }
    }
    async function openRemote(origin, namespace, secret, timeoutMs, fetcher) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        try {
            const response = await fetcher(`${normalizeOrigin(origin)}/claims/open`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({ namespace, secret }),
                signal: controller?.signal,
            });
            let data = { ok: false, error: 'UNKNOWN_ERROR' };
            try {
                data = (await response.json());
            }
            catch {
                data = { ok: false, error: `OPEN_FAILED_${response.status}` };
            }
            if (!response.ok || !data.ok) {
                return {
                    ok: false,
                    error: String(data.error || `OPEN_FAILED_${response.status}`),
                };
            }
            return data;
        }
        catch (error) {
            const message = error instanceof Error ? error.name : String(error);
            return {
                ok: false,
                error: message === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
            };
        }
        finally {
            if (timeoutId)
                clearTimeout(timeoutId);
        }
    }
    function getStatus() {
        return {
            ...lastStatus,
            hosts: lastStatus.hosts.map((host) => ({
                ...host,
                status: { ...host.status },
                capabilities: { ...host.capabilities },
            })),
        };
    }
    async function waitUntilReady(timeoutMs = 10000) {
        if (currentState === 'ready' && lastReadyPayload)
            return lastReadyPayload;
        return await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                unsub();
                reject(new Error('TIMEOUT_WAITING_FOR_READY'));
            }, timeoutMs);
            const unsub = once('ready', (payload) => {
                clearTimeout(timeoutId);
                resolve(payload);
            });
        });
    }
    async function validateHosts(input = {}) {
        const namespace = String(input.namespace || defaultNamespace || '').trim();
        const secret = String(input.secret !== undefined ? input.secret : defaultSecret);
        const strategy = input.triadStrategy || 'first-success';
        const timeoutMs = Number(input.timeoutMs || 5000);
        const fetcher = options.fetcher || fetch;
        const cycleId = ++currentCycleId;
        if (!namespace) {
            const error = {
                code: 'NAMESPACE_REQUIRED',
                message: 'Cannot validate hosts without namespace.',
            };
            emit('error', error);
            transition('offline', cycleId);
            lastStatus = {
                ...lastStatus,
                cycleId,
                state: 'offline',
                overall: 'offline',
                activeNamespace: namespace,
                totalHosts: 0,
                verifiedHosts: 0,
                hosts: [],
            };
            emit('status:change', getStatus());
            return getStatus();
        }
        transition('discovering', cycleId);
        const hosts = discoverHosts({
            namespace,
            bootstrap: input.bootstrap,
        });
        if (!hosts.length) {
            transition('offline', cycleId);
            lastStatus = {
                ...lastStatus,
                cycleId,
                state: 'offline',
                overall: 'offline',
                activeNamespace: namespace,
                totalHosts: 0,
                verifiedHosts: 0,
                hosts: [],
            };
            emit('status:change', getStatus());
            return getStatus();
        }
        transition('probing', cycleId);
        let verifiedHost = null;
        let hydratedFromHostId = '';
        let hydratedIdentityHash = '';
        let hydratedMemoriesCount = 0;
        for (let i = 0; i < hosts.length; i += 1) {
            const host = hosts[i];
            const start = Date.now();
            const reachable = await ping(host.origin, timeoutMs, fetcher);
            host.status.transport = reachable ? 'up' : 'down';
            host.status.latencyMs = Date.now() - start;
            host.status.lastSeen = Date.now();
            if (!reachable) {
                host.status.triad = 'unverified';
                host.error = 'NETWORK_ERROR';
                persistHostRecord(namespace, host);
                continue;
            }
            if (!secret) {
                host.status.triad = 'unverified';
                host.error = 'SECRET_REQUIRED';
                persistHostRecord(namespace, host);
                continue;
            }
            transition('opening', cycleId);
            const opened = await openRemote(host.origin, namespace, secret, timeoutMs, fetcher);
            if (!opened.ok) {
                const errorCode = String(opened.error || 'OPEN_FAILED');
                host.status.triad = errorCode === 'CLAIM_NOT_FOUND' ? 'unverified' : 'failed';
                host.error = errorCode;
                emit('error', {
                    code: errorCode,
                    message: `Triad open failed on ${host.origin}`,
                    hostId: host.id,
                });
                persistHostRecord(namespace, host);
                continue;
            }
            host.status.triad = 'verified';
            host.error = undefined;
            persistHostRecord(namespace, host);
            emit('host:triad:success', host.id);
            if (!verifiedHost)
                verifiedHost = host;
            transition('hydrating', cycleId);
            const allMemories = Array.isArray(opened.memories) ? opened.memories : [];
            const learnedCountBefore = hydratedMemoryHashes.size;
            allMemories.forEach((memory) => {
                hydrateMemory(memory);
            });
            hydratedMemoriesCount += Math.max(0, hydratedMemoryHashes.size - learnedCountBefore);
            if (opened.noise !== undefined) {
                me.noise = String(opened.noise || '');
            }
            hydratedFromHostId = host.id;
            hydratedIdentityHash = String(opened.identityHash || '');
            if (strategy === 'first-success') {
                for (let j = i + 1; j < hosts.length; j += 1) {
                    hosts[j].status.triad = 'skipped';
                }
                break;
            }
        }
        if (cycleId !== currentCycleId) {
            return getStatus();
        }
        const verifiedHosts = hosts.filter((host) => host.status.triad === 'verified').length;
        const overall = verifiedHosts > 0 ? 'healthy' : 'degraded';
        const state = verifiedHosts > 0 ? 'ready' : 'degraded';
        transition(state, cycleId);
        lastStatus = {
            cycleId,
            state,
            overall,
            activeNamespace: namespace,
            totalHosts: hosts.length,
            verifiedHosts,
            hosts,
        };
        emit('status:change', getStatus());
        if (verifiedHost) {
            const payload = {
                namespace,
                cycleId,
                sourceHostId: hydratedFromHostId || verifiedHost.id,
                sourceOrigin: verifiedHost.origin,
                identityHash: hydratedIdentityHash,
                timestamp: Date.now(),
                hydratedMemories: hydratedMemoriesCount,
                summary: {
                    verifiedHosts,
                    totalHosts: hosts.length,
                    overall,
                },
            };
            lastReadyPayload = payload;
            emit('ready', payload);
        }
        return getStatus();
    }
    function pointer(expression, resolveOptions = {}) {
        const target = parseTarget(expression, { defaultMode: 'reactive' });
        const remotePointer = createRemotePointer(target, {
            ...options,
            resolveLocalTarget: (localTarget) => {
                if (localTarget.namespace.prefix !== null) {
                    throw new Error('LOCAL_TARGET_PREFIX_NOT_ALLOWED');
                }
                if (localTarget.namespace.constant !== 'local' && localTarget.namespace.constant !== 'self') {
                    throw new Error('LOCAL_TARGET_REQUIRED');
                }
                return resolveBoundKernelTarget(localTarget.intent.path);
            },
        });
        if (!Object.keys(resolveOptions).length)
            return remotePointer;
        return {
            ...remotePointer,
            resolve(input = {}) {
                return remotePointer.resolve({
                    ...resolveOptions,
                    ...input,
                });
            },
        };
    }
    function hydrateMemory(memory) {
        const normalizedMemory = normalizeReplayMemory(memory);
        const key = hashMemory(normalizedMemory);
        if (hydratedMemoryHashes.has(key))
            return false;
        hydratedMemoryHashes.add(key);
        hydratedMemories.push(normalizedMemory);
        if (typeof me.learn === 'function') {
            me.learn(normalizedMemory);
            return true;
        }
        if (typeof me.replayMemories === 'function') {
            me.replayMemories(hydratedMemories.slice());
            return true;
        }
        return true;
    }
    function createLearnedMemory(path, value) {
        const normalizedPath = path.map((part) => String(part || '').trim()).filter(Boolean);
        if (normalizedPath.length === 0)
            return null;
        return {
            path: normalizedPath.join('.'),
            operator: null,
            expression: value,
            value,
        };
    }
    async function open(input) {
        const namespace = String(input.namespace || '').trim();
        const secret = String(input.secret || '');
        const origin = String(input.origin || 'http://localhost:8161').replace(/\/+$/, '');
        if (!namespace)
            throw new Error('NAMESPACE_REQUIRED');
        if (!secret)
            throw new Error('SECRET_REQUIRED');
        const fetcher = input.fetcher || fetch;
        const response = await fetcher(`${origin}/claims/open`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(input.headers || {}),
            },
            body: JSON.stringify({ namespace, secret }),
        });
        const data = (await response.json());
        if (!response.ok || !data?.ok) {
            throw new Error(String(data?.error || `OPEN_FAILED_${response.status}`));
        }
        const allMemories = Array.isArray(data.memories) ? data.memories : [];
        const memories = allMemories.filter((memory) => hydrateMemory(memory));
        me.noise = String(data.noise || '');
        return {
            status: 'verified',
            namespace: String(data.namespace || namespace),
            identityHash: String(data.identityHash || ''),
            noise: String(data.noise || ''),
            openedAt: Number(data.openedAt || Date.now()),
            memoriesCount: memories.length,
        };
    }
    // Triad: auto-open if namespace + secret were provided at bind time
    if (options.namespace && options.secret) {
        _ready = open({
            namespace: options.namespace,
            secret: options.secret,
            origin: options.origin,
            fetcher: options.fetcher,
        }).catch(() => null);
    }
    function bindKernelResolver(bindOptions = {}) {
        resolverConfig = {
            detectRemote: bindOptions.detectRemote || resolverConfig.detectRemote,
            mapToExpression: bindOptions.mapToExpression || resolverConfig.mapToExpression,
            applyResult: bindOptions.applyResult || resolverConfig.applyResult,
            resolveOptions: bindOptions.resolveOptions || resolverConfig.resolveOptions,
        };
        return true;
    }
    function getOrCreateRemoteSlot(path) {
        if (!resolverConfig.detectRemote(path))
            return undefined;
        const key = path.join('.');
        const existing = remoteSlots.get(key);
        if (existing)
            return existing;
        const expression = resolverConfig.mapToExpression(path);
        if (!expression)
            return undefined;
        const remotePointer = pointer(expression);
        const slot = {
            key,
            path: path.slice(),
            expression,
            pointer: remotePointer,
            promise: Promise.resolve({
                ok: false,
                status: 0,
                endpoint: '',
                elapsedMs: 0,
                data: null,
            }),
        };
        slot.promise = remotePointer.resolve(resolverConfig.resolveOptions).then((resolved) => {
            slot.lastResult = resolved;
            if (resolved.ok) {
                const applied = resolverConfig.applyResult(resolved.data, path);
                const learnedValue = applied === undefined ? unwrapResolvedValue(resolved.data) : applied;
                remoteOverlay.set(key, learnedValue);
                const learnedMemory = createLearnedMemory(path, learnedValue);
                if (learnedMemory)
                    hydrateMemory(learnedMemory);
            }
            return resolved;
        });
        remoteSlots.set(key, slot);
        return slot;
    }
    function createPendingToken(slot) {
        return {
            status: 'pending',
            path: slot.key,
            pointer: slot.pointer,
            promise: slot.promise,
        };
    }
    function exposeKernelProperty(prop) {
        if (!(prop in me))
            return undefined;
        const value = me[prop];
        return typeof value === 'function' ? value.bind(me) : value;
    }
    function createFacade(path = []) {
        const fn = (...args) => {
            if (path.length === 0) {
                if (typeof me === 'function') {
                    if (args.length === 1 && typeof args[0] === 'string') {
                        const raw = String(args[0] || '').trim();
                        const local = tryReadLocal(me, raw.split('.').filter(Boolean));
                        if (local !== undefined)
                            return local;
                        if (raw.includes(':')) {
                            const slot = getOrCreateRemoteSlot(raw.split('.').filter(Boolean));
                            return slot ? createPendingToken(slot) : undefined;
                        }
                    }
                    return me(...args);
                }
                return undefined;
            }
            const invoked = tryInvokeKernelPath(me, path, args);
            if (invoked !== undefined)
                return invoked;
            return createFacade(path);
        };
        return new Proxy(fn, {
            get(_target, prop) {
                if (typeof prop === 'symbol')
                    return fn[prop];
                const key = String(prop);
                if (path.length === 0) {
                    if (key === 'kernel')
                        return me;
                    if (key === 'open')
                        return open;
                    if (key === 'ready')
                        return _ready;
                    if (key === 'pointer')
                        return pointer;
                    if (key === 'bindKernelResolver')
                        return bindKernelResolver;
                    if (key === 'discoverHosts')
                        return discoverHosts;
                    if (key === 'validateHosts')
                        return validateHosts;
                    if (key === 'getStatus')
                        return getStatus;
                    if (key === 'waitUntilReady')
                        return waitUntilReady;
                    if (key === 'on')
                        return on;
                    if (key === 'once')
                        return once;
                    if (key === 'off')
                        return off;
                    if (key === 'state')
                        return currentState;
                    if (key === 'currentCycleId')
                        return currentCycleId;
                    const kernelProperty = exposeKernelProperty(key);
                    if (kernelProperty !== undefined)
                        return kernelProperty;
                }
                const currentKey = path.join('.');
                const cachedCurrent = remoteOverlay.get(currentKey);
                if (cachedCurrent &&
                    typeof cachedCurrent === 'object' &&
                    !Array.isArray(cachedCurrent) &&
                    Object.prototype.hasOwnProperty.call(cachedCurrent, key)) {
                    return cachedCurrent[key];
                }
                const currentSlot = getOrCreateRemoteSlot(path);
                if (currentSlot) {
                    if (key === 'status') {
                        return currentSlot.lastResult
                            ? currentSlot.pointer.__ptr.resolution.status
                            : 'pending';
                    }
                    if (key === 'pointer')
                        return currentSlot.pointer;
                    if (key === 'promise')
                        return currentSlot.promise;
                    if (key === 'result')
                        return currentSlot.lastResult;
                    if (key === 'then')
                        return currentSlot.promise.then.bind(currentSlot.promise);
                }
                const nextPath = [...path, key];
                const nextKey = nextPath.join('.');
                if (remoteOverlay.has(nextKey))
                    return remoteOverlay.get(nextKey);
                const local = tryReadLocal(me, nextPath);
                if (local !== undefined)
                    return local;
                getOrCreateRemoteSlot(nextPath);
                return createFacade(nextPath);
            },
            apply(_target, _thisArg, args) {
                return fn(...args);
            },
        });
    }
    bindKernelResolver();
    return createFacade([]);
}
//# sourceMappingURL=binder.js.map