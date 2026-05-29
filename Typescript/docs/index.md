---
layout: home

hero:
  name: "cleaker(me)"
  text: "Who am I, here?"
  tagline: " Node.js ⚡ TypeScript Documentation"
  image:
    src: https://res.cloudinary.com/dkwnxf6gm/image/upload/v1773198145/cleaker_hpxk2f.png
    alt: cleaker artifact
  actions:
    - theme: brand
      text: The Model
      link: /The-Model
    - theme: alt
      text: API Reference
      link: /api/
---

<style>
.VPHomeHero .image-container img {
  max-width: 220px !important;
  width: 220px !important;
  height: auto !important;
}
</style>

<div class="vp-doc" style="max-width:960px;margin:0 auto;padding:2rem 1.5rem">

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

// Fires when remote fails and local surface is next
node.on('namespace:fallback', ({ failedOrigin, failedReason, fallbackOrigin, namespace }) => {
  console.warn(`[${namespace}] ${failedOrigin} (${failedReason}) → ${fallbackOrigin}`)
})

// Fires when ALL surfaces are exhausted — includes full tried list + explain string
node.on('namespace:failed', ({ namespace, tried, explain }) => {
  console.error(explain)
})

// Fires when a surface is verified and memories are hydrated
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

</div>
