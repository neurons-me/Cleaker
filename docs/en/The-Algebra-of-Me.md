---
layout: gui-doc
title: "The Algebra of .me"
description: "One constant, a mounted .me, and its intersections: five axioms, and the relations that follow from them."
mepath:
  - text: Cleaker
    url: https://neurons-me.github.io/Cleaker/
  - text: Docs
    url: https://neurons-me.github.io/Cleaker/docs/
canonical: https://neurons-me.github.io/Cleaker/docs/en/The-Algebra-of-Me.html
crumb: the algebra of me
scripts:
  - /assets/algebra-live/algebra-live.js?v=1
related:
  - The-Model.html
  - Statuses.html
  - /.me/docs/Audiences.html
  - /.me/docs/Syntax.html
---
# The Algebra of .me

> **The singularity is .me.**

Everything starts from a `.me` and grows out of it: a name that is always the same, a tree mounted on it, and the audiences that decide who opens each part of that tree. Five axioms, then the relations that follow from them.

Each axiom is one formal line, one sentence, one `me://` example.

---

## Axioms

### Ax1 — One constant

```
seed(N) = N        id(N) = keccak256("this.me/identity:v1::" + N)
```

A namespace is a public name. Its seed is the name itself, so anyone can compute its identity hash: it protects nothing, and it never rotates. It is the axis. Everything around it (owners, keys, the server's key, who opens what) is mechanism, and mechanism can rotate.

`me://cleaker.me` is the same axis for every viewer, before anyone signs in.

<div data-live="AxIdentity"></div>

### Ax2 — Mounting

```
cleaker(me, N)  ⟹  me ↪ N        <handle>.<root>  ≡  <root>/@<handle>
```

`cleaker(me)` mounts a `.me` on the axis, and the tree grows from that `.me`: `keys`, `wallet`, `contacts`, and whatever it declares. A handle under a root is the same place written two ways.

`me://jabellae.cleaker.me:read/contacts.friends` is the same path as `cleaker.me/@jabellae/contacts/friends`.

### Ax3 — Intersections are audiences

```
me(a) ∪ me(b)   any one of them opens         W_i = wrap(pub_i, K)
me(a) ∩ me(b)   only both together open        K = s_a ⊕ s_b
A \ x           everyone in A except x         resolved when sealing
{self}          a secret scope _()             the owner opens, a guest gets nothing
```

The algebra of `.me` is not over addresses: it is over who can open a value. Every secret scope is an audience, and the smallest audience is `{self}`. There is no NOT and no threshold; a key once read cannot be un-read, so removal works forward, by resealing.

Which of these each implementation runs today is listed in [.me Audiences](https://neurons-me.github.io/.me/docs/Audiences.html#status-by-implementation).

`me.wallet["_"]("vault-key")` seals `wallet`: `me://jabellae.cleaker.me:read/wallet.note` opens for jabellae and returns nothing to a guest.

### Ax4 — Namespace ≠ location

```
position = N @ surface        port, path in the URL, query  ∉  N
```

The port, the URL and `?ref=` say where you are (the transport, the surface), not which namespace you are in. `cleaker.me` reached through port 8161 is still `cleaker.me`, not a smaller namespace.

`cleaker.me @ neurons-me.github.io` is the namespace `cleaker.me` seen from the page `neurons-me.github.io`; the page grants nothing inside it.

<div data-live="AxLocation"></div>

### Ax5 — Authority never comes from the seed

```
write(N, p) accepted  ⟺  proof(p) verifies against the key anchored in claim(N)        id(N) ⊬ authority
```

What governs a namespace is a key anchored in its claim. The identity hash is a label anyone can compute (Ax1), so it is never authority: knowing the name opens nothing.

`me://jabellae.cleaker.me:write/profile.name` is accepted only with a proof signed by the key registered in jabellae's claim.

<div data-live="AxAuthority"></div>

---

## Theorems: relations

The relations between namespaces follow from the axioms. Their targets are always a namespace and a path, never a location (Ax4).

### T1 — Relation as function

```
R : N_viewer → N_target
```

A relation maps whoever is looking to what they reach.

`me://jabellae.cleaker.me:read/board` maps any viewer to jabellae's board.

### T2 — Refinement

```
B adds a handle or a path to A   ⟹   B ⊑ A
```

A handle under a root (Ax2) or a path under a namespace is more specific, and lies inside it. A port, a URL or a query adds nothing to the namespace (Ax4), so they never refine it.

`jabellae.cleaker.me/board ⊑ jabellae.cleaker.me ⊑ cleaker.me`; `cleaker.me:8161` is not ⊑ `cleaker.me`, it is `cleaker.me` through another door.

### T3 — Composition

```
(R_B ∘ R_A)(v) = R_B(R_A(v))
```

Relations chain: where the first one leads is where the second one starts.

`/?` (the viewer's own namespace) followed by `board` reaches `me://jabellae.cleaker.me:read/board` when jabellae is the viewer.

### T4 — The self: `/?`

```
I(v) = v        defined only for a viewer that proves (Ax5)
```

`/?` binds the namespace to whoever is looking. Binding needs a who that can prove; an anonymous viewer has no self to map to.

`cleaker.me/?` is jabellae's own place when jabellae is signed in, and nothing for a guest.

### T5 — Existence: `/`

```
E(v) = N        for every viewer v, including none
```

`/` is the namespace without anyone looking: it exists before identity (Ax1), and every viewer reaches the same thing.

`me://cleaker.me:read/` resolves the same for every viewer, signed in or not.

---

## Where each part is implemented

- **The algebra** (syntax, secret scopes, audiences): [.me Audiences](https://neurons-me.github.io/.me/docs/Audiences.html), [Algebra of Contexts](https://neurons-me.github.io/.me/docs/Algebra-of-Contexts.html), [Seed](https://neurons-me.github.io/.me/docs/Seed.html).
- **Mounting and namespaces** (`cleaker(me)`, `me://`, statuses): [The Model](./The-Model.html), [Statuses](./Statuses.html).
- **The mesh** (resolving a namespace across surfaces): [monad](https://neurons-me.github.io/monad/).
