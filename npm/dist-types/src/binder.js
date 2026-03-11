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