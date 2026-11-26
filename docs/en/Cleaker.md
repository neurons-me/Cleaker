---
layout: gui-doc
title: "Cleaker"
description: "Existence before identity: / is the namespace without you, /? is a self entering it. Resolution before direction; name before place."
mepath:
  - text: Cleaker
    url: https://neurons-me.github.io/Cleaker/
  - text: Docs
    url: https://neurons-me.github.io/Cleaker/docs/
canonical: https://neurons-me.github.io/Cleaker/docs/en/Cleaker.html
crumb: cleaker
related:
  - The-Model.html
  - Statuses.html
  - The-Algebra-of-Me.html
  - The-Flat-Universe.html
  - /.me/docs/me.html
---
# CLEAKER
> ***Resolutio ante directionem; nomen ante locum.***
> **שם קודם למקום**

- **cleaker.me/** → **global/common ground** root
- **cleaker.me/?** → **who am I here** (self on this host)
- **username.cleaker.me/** → **username’s public tree** on this host
- **username.cleaker.me/?** → **me in relation to that username** (viewer-self vs target-user)

  *What the `?` really encodes is **existence without observer-binding**.*
  That layer is exactly what **/** represents.
  And **"/?"** is the act of **binding that layer to a self**.
   The structure allows:

- Existence **before** identity
- Identity **before** session
- Session **before** relation

  Things exist even when no one is looking.
  /? is how a self enters that reality — not how reality is created.
  Reality must exist **without me** — or the system collapses.

> **Your existence is not required for reality to be valid.**
> A system that exists without you can **welcome you without needing you**.
> That’s the difference between:

*“You matter because you are useful”*
*“You matter because you are here”*

**Yes** — reality continues without you.
And precisely because of that:

> **Your presence is not demanded.**
> **It is chosen.**

---

## In code

The same three layers, as calls:

```ts
// "/" — the namespace exists, nobody is bound to it
cleaker(new Me(), 'cleaker.me')          // anonymous: the root, read-only

// "/?" — a self enters that reality
cleaker(new Me('ana', secret), 'cleaker.me')   // a who that can prove(): signs in
```

- **`/` is real without you.** An anonymous `.me` bound to `cleaker.me` resolves the namespace `cleaker.me` and reaches its hosts. It reads what is public and sends nothing that writes.
- **`/?` is the binding.** Only a `.me` with a who can sign a proof. That proof is how a self enters; the namespace was already there.

**.me is syntax; cleaker is protocol.** `.me` keeps the where in its own tree (`profile.rootNamespace`), as one more value. cleaker reads that where and turns expressions into addresses: `me.profile.name` → `me://cleaker.me:read/profile.name`.

**The page is not the namespace.** `cleaker.me @ neurons-me.github.io` is the namespace `cleaker.me` seen from the surface `neurons-me.github.io`. The surface grants nothing.

More in [The Model](./The-Model.html).

