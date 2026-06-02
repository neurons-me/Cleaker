# cleaker `3.2.1`

> Who am I, here.

`cleaker` binds a sovereign `.me` identity to a namespace surface — the resolver that answers *"where does this identity live in the network?"*

---

## Install

```bash
npm install cleaker
```

## Quick Start

```ts
import me from 'this.me'
import cleaker from 'cleaker'

// Sovereign identity — offline, deterministic, no network required
me('suign', 'secret')

// Project identity into a namespace surface
const node = cleaker(me, 'cleaker.me')

// Validate surfaces, open triad, hydrate memories into kernel
const status = await node.validateHosts({
  namespace: 'suign.cleaker.me',
  secret: 'secret',
})

console.log(status.overall)  // 'healthy' | 'degraded' | 'offline'

// Wait until verified
await node.waitUntilReady()
```

---

## Surface fallback & events

```ts
const node = cleaker(me, 'cleaker.me')

node.on('namespace:fallback', ({ failedOrigin, failedReason, fallbackOrigin, namespace }) => {
  console.warn(`[${namespace}] ${failedOrigin} (${failedReason}) → ${fallbackOrigin}`)
})

node.on('namespace:failed', ({ namespace, tried, explain }) => {
  console.error(explain)
})

node.on('ready', ({ namespace, identityHash, hydratedMemories }) => {
  console.log(`ready on ${namespace} — ${hydratedMemories} memories hydrated`)
})
```

---

## Space resolution

| Input | Transport | Namespace constant |
|---|---|---|
| `cleaker(me)` | `https://cleaker.me` | `cleaker.me` |
| `cleaker(me, 'neurons.me')` | `https://neurons.me` | `neurons.me` |
| `cleaker(me, 'sui-desk')` | `http://sui-desk.local:8161` | `sui-desk.local` |
| `cleaker(me, '192.168.1.5')` | `http://192.168.1.5:8161` | `192.168.1.5` |

---

## Architecture

```
this.me    → sovereign kernel. (who, secret) → compound seed → identity.
cleaker    → resolver. projects .me into a namespace. emits fallback events.
monad.ai   → daemon. exposes namespace over HTTP. runs the mesh.
```

> *Resolution before direction. Name before place.*

[The Model →](./The-Model) · [Algebra of Me →](./Algebra-of-Me) · [The Flat Universe →](./The-Flat-Universe)
