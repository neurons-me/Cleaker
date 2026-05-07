# cleaker

> ***Resolutio ante directionem — nomen ante locum***
> Resolution before direction. Name before place.

**cleaker** is the contextual namespace binding layer for the neurons.me stack. It fixes where you are, then places identity into that context.

---

## Installation

```bash
npm install cleaker
```

---

## Core forms

```ts
cleaker()
// Fixes the current namespace context.

cleaker(me)
// Mounts a .me kernel into the current namespace tree.

cleaker(me, { namespace, secret, space })
// Full operational form — binds identity, signs in, hydrates from memory.
```

---

## Quick start

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
self.profile.name; // value from remote memory, learned locally
```

---

- [The Model](./The-Model.md) — identity in context
- [Cleaker Protocol](./Cleaker.md) — namespace protocol overview
- [Algebra of Me](./Algebra-of-Me.md) — formal namespace algebra
- [API Reference](./api/README.md)
