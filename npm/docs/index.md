---
layout: home

hero:
  name: "cleaker(me)"
  text: "Who am I, here?"
  tagline: "Node.js ⚡ TypeScript Documentation"
  image:
    src: https://res.cloudinary.com/dkwnxf6gm/image/upload/v1773198145/cleaker_hpxk2f.png
    alt: cleaker artifact
  actions:
    - theme: brand
      text: Getting Started
      link: /The-Model
    - theme: alt
      text: API Reference
      link: /api/
---

<div class="vp-doc" style="max-width:960px;margin:0 auto;padding:2rem 1.5rem">

## Quick Start

**Install from npm:**

```bash
npm install cleaker
```

**Or clone and run locally:**

```bash
git clone https://github.com/neurons-me/Cleaker
cd Cleaker/npm
npm install
npm run dev
```

**Basic usage:**

```ts
import cleaker from 'cleaker';
import Me from 'this.me';

const me = new Me();
const self = cleaker(me, {
  namespace: 'ana.cleaker.me',
  secret: 'luna',
  space: 'localhost:8161',
});

await self.ready;
console.log(self.profile.name); // resolved from remote memory
```

---

## Core concepts

**Resolution before direction** — `cleaker()` fixes the current namespace context. The runtime already knows where it is; cleaker crystallizes it as a root.

**Identity in context** — `cleaker(me)` mounts a `.me` kernel into the namespace tree. Identity exists in relation to something else; there is no meaningful `.me` floating in the void.

**Namespace isolation** — Each space produces a fully isolated branch. The same seed, different contexts — `suign.neurons.me` vs `suign.local` — same truth, different address.

---

## Philosophy

> *Resolutio ante directionem — nomen ante locum.*
> Resolution before direction. Name before place.

Things exist even when no one is looking. `/? ` is how a self enters that reality — not how reality is created.

[The Model →](./The-Model) · [Algebra of Me →](./Algebra-of-Me) · [The Flat Universe →](./The-Flat-Universe)

</div>
