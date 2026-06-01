<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1773198145/cleaker_hpxk2f.png" />
  <img src="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1773198145/cleaker_hpxk2f.png" alt="cleaker" width="200" />
</picture>

# cleaker `3.2.0`

[![npm](https://img.shields.io/npm/v/cleaker)](https://www.npmjs.com/package/cleaker) [![docs](https://img.shields.io/badge/docs-neurons--me.github.io-blue)](https://neurons-me.github.io/Cleaker/docs/)

**Who am I, here.**

`cleaker` binds a sovereign `.me` identity to a namespace surface. It is the resolver — it answers *"where does this identity live in the network?"*

```ts
import me from 'this.me'
import cleaker from 'cleaker'

me('suign', 'secret')                  // sovereign identity — offline, deterministic
const node = cleaker(me)               // → cleaker.me (default public surface)
const node = cleaker(me, 'neurons.me') // → neurons.me
const node = cleaker(me, 'sui-desk')   // → http://sui-desk.local:8161 (LAN)
```

---

## The two primitives

| | |
|---|---|
| `me('suign', 'secret')` | sovereign identity — works offline, no network, no server |
| `cleaker(me, space)` | first public act — projects that identity into a namespace surface |

`.me` is the kernel — a sovereign computation that works without any external service.  
`cleaker` is the resolver — the surface where an identity becomes addressable.

---

## Space resolution rules

`cleaker(me, space)` accepts any host form and normalizes it automatically:

| Input | Transport origin | Namespace constant |
|---|---|---|
| `cleaker(me)` | `https://cleaker.me` | `cleaker.me` |
| `cleaker(me, 'neurons.me')` | `https://neurons.me` | `neurons.me` |
| `cleaker(me, 'sui-desk')` | `http://sui-desk.local:8161` | `sui-desk.local` |
| `cleaker(me, 'sui-desk:9000')` | `http://sui-desk.local:9000` | `sui-desk.local` |
| `cleaker(me, '192.168.1.5')` | `http://192.168.1.5:8161` | `192.168.1.5` |
| `cleaker(me, 'sui-laptop.local:8181')` | `http://sui-laptop.local:8181` | `sui-laptop.local` |

**Rule:** bare hostname (no dot) → `.local` + port 8161. Public domain → `https`. IP → `http` + port 8161. Port is transport only — never part of the namespace constant.

---

## Namespace structure

```
cleaker.me                rootspace — public, verifiable via DNS
suign.cleaker.me          compound  — user prefix + rootspace constant
sui-macbook.local         private/LAN surface
suign.sui-macbook.local   compound on LAN
```

Same seed, different contextual branches:

```
me('suign', 'secret')
  ├── cleaker(me, 'neurons.me')  → suign.neurons.me
  ├── cleaker(me, 'sui-desk')    → suign.sui-desk.local
  └── cleaker(me, '192.168.1.5') → suign.192.168.1.5
```

Change the space, change the branch. Change the seed, change the universe.

---

## Core API

```ts
import me from 'this.me'
import cleaker from 'cleaker'

me('suign', 'my-secret')                        // Step 1 — sovereign identity
const node = cleaker(me, 'cleaker.me')           // Step 2 — bind to surface

// Probe all surfaces, open triad, hydrate memories into kernel
const status = await node.validateHosts({
  namespace: 'suign.cleaker.me',
  secret: 'my-secret',
})

console.log(status.overall)                      // 'healthy' | 'degraded' | 'offline'
console.log(status.hosts[0].status.triad)        // 'verified' | 'unverified' | 'failed' | 'skipped'

// Wait until a surface is verified and memories are hydrated
await node.waitUntilReady()

// Explicit sign-in
const result = await node.signIn({
  namespace: 'suign.cleaker.me',
  secret: 'my-secret',
})
// result.status === 'verified'
// result.memoriesCount — memories replayed into kernel

// Discover known hosts for the namespace
const hosts = node.discoverHosts()
```

### CleakerOptions

```ts
const node = cleaker(me, 'cleaker.me', {
  namespace: 'suign.cleaker.me',       // explicit namespace override
  secret: 'my-secret',                 // auto-signIn at bind time
  fetcher: customFetch,                // inject fetch (tests, custom transport)
  bootstrap: ['http://localhost:8161'], // additional surfaces to probe
})
```

---

## Surface fallback & observability

When a remote surface fails, cleaker automatically tries the next surface in the priority list and emits structured events so callers can log or react to the degraded path.

```ts
const node = cleaker(me, 'cleaker.me')

// Emitted when a remote surface fails and a local surface is next
node.on('namespace:fallback', ({ namespace, failedOrigin, failedReason, fallbackOrigin }) => {
  console.warn(`[${namespace}] ${failedOrigin} failed (${failedReason}) → retrying on ${fallbackOrigin}`)
})

// Emitted when ALL surfaces have been tried and resolution gives up
node.on('namespace:failed', ({ namespace, tried, explain }) => {
  // explain is human-readable:
  // "namespace 'suign.cleaker.me' failed to resolve. tried 3 surfaces:
  //   [1] https://cleaker.me → NETWORK_ERROR
  //   [2] https://suis-macbook-air.local → NETWORK_ERROR
  //   [3] http://localhost:8161 → NETWORK_ERROR"
  console.error(explain)
  tried.forEach(t => console.error(t.origin, t.reason))
})

await node.validateHosts({ namespace: 'suign.cleaker.me', secret: 'my-secret' })
```

**Auto-discovered fallback chain** (no config required):

1. Configured surface (`space` argument)
2. Environment (`CLEAKER_NAMESPACE_ROOT` / `CLEAKER_NAMESPACE_HOST`)
3. Machine hostname via `os.hostname()` → e.g. `suis-macbook-air.local`
4. `http://localhost:8161` (development default)

Every machine discovers its own local surface automatically — the same mechanism that lets monads find and announce themselves on the LAN.

---

## Full events API

```ts
// CleakerStatus emitted on every state transition
node.on('status:change', (status: CleakerStatus) => {})

// Fires when the first surface is verified and memories are hydrated
node.on('ready', (payload: CleakerReadyPayload) => {})

// Per-host error during triad open
node.on('error', ({ code, message, hostId }) => {})

// A specific host passed triad verification
node.on('host:triad:success', (hostId: string) => {})

// A remote surface failed; local fallback is next
node.on('namespace:fallback', (payload: NamespaceFallbackPayload) => {})

// All surfaces exhausted; namespace resolution giving up
node.on('namespace:failed', (payload: NamespaceFailedPayload) => {})
```

Unsubscribe by calling the returned function:

```ts
const unsub = node.on('ready', handler)
unsub() // removes the handler
```

---

## Remote pointer

A semantic address — no kernel, no network call at creation time:

```ts
import cleaker from 'cleaker'

const ptr = cleaker('me://ana.cleaker.me:read/profile')
// ptr.__ptr.resolution.status === 'unresolved'
// Resolved lazily on first access or explicit .resolve()
```

---

## Monad scope-chain routing

Targets use `monad[name]` syntax for scope-chain routing:

```
me://suign.cleaker.me:read/monad[frank]/projects/x
```

Resolves `frank` via fallback chain:

```
1. frank @ suign.cleaker.me   (compound — exact match)
2. frank @ cleaker.me         (rootspace — fallback)
3. 404
```

Same name, different contextual projections. Mirrors JS prototype chain / CSS cascade / DNS fallback.

---

## Install

```bash
npm install cleaker
```

---

## Architecture

```
this.me    → sovereign kernel. derives identity from (who, secret) seed. works offline.
cleaker    → resolver. projects .me into a namespace surface. emits fallback events.
monad.ai   → daemon. exposes the namespace over HTTP. runs the mesh.
```

> *Resolutio ante directionem — nomen ante locum.*
> Resolution before direction. Name before place.
>
> **Who are we, here.**
