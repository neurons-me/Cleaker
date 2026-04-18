## **The Algebra of** **.Me**
Let us define the universe of the system:

> **𝕌 =** the set of all possible namespaces.
> **A** **namespace** is a composite structure (by definition):
> **N = (domain, port)**

###### Each component may be present or absent.

## **Base Rule: “More specific ⇒ Subset”**
When additional components are introduced (subdomain, port, path), the covered region becomes smaller.
Examples:

- **cleaker.me** contains **cleaker.me:8161**
- **cleaker.me** contains **jabellae.cleaker.me**
- **jabellae.cleaker.me** contains **jabellae.cleaker.me/board**
- **localhost** contains **localhost:8161**

Formally:

If **A** is less specific than **B**, then:
**B ⊆ A**

------

## **A0 — Namespace as Region**
A namespace **N** is a region defined by a set of coordinates:
**N = { domain, port?, path?, subdomain?, … }**
There exists a refinement operator (**⊑**) such that:
If **B** adds coordinates to **A**, then:
**B ⊑ A** and **B ⊆ A**

---

**Key confirmations:**
	•	**cleaker.me/** as non-relational existence layer ✔
	•	**/?** as observer binding operator ✔
	•	**username.cleaker.me/** as public namespace root ✔
	•	**username.cleaker.me/?** as relation(viewer → target) ✔
	•	Namespace algebra (⊆, ⊑) matches how DNS, ports, and paths actually work ✔
	•	No circular dependency between identity and existence ✔

------
## **A1 — Relation as Function**
A relation **R** is a function that maps a viewer namespace to a target namespace:
**R : N_viewer → N_target**
Examples:
- The relation defined by jabellae.cleaker.me/? maps viewer namespaces to jabellae.cleaker.me/
- The relation defined by jabellae.cleaker.me/board maps viewer namespaces to jabellae.cleaker.me/board
------
## **A2 — Relation Refinement**
A relation **R_B** refines another relation **R_A** if for all viewer namespaces **N_viewer**:
If **R_A(N_viewer) = N_target_A** and **R_B(N_viewer) = N_target_B**, then:
**N_target_B ⊑ N_target_A**
Examples:
- The relation defined by **jabellae.cleaker.me/board** refines the relation defined by jabellae.cleaker.me/
- The relation defined by j**abellae.cleaker.me/?ref=1234** refines the relation defined by **jabellae.cleaker.me/**
------
## **A3 — Relation Composition**
Given two relations **R_A : N_viewer → N_intermediate** and **R_B : N_intermediate → N_target**, their composition **R_C = R_B ∘ R_A** is defined as:
**R_C(N_viewer) = R_B(R_A(N_viewer))**
Examples:

- If **R_A** is defined by jabellae.cleaker.me/? and **R_B** is defined by cleaker.me/board, then **R_C** maps viewer namespaces to jabellae.cleaker.me/board
------
## **A4 — Identity Relation**
The identity relation **I** maps any viewer namespace to itself:
**I(N_viewer) = N_viewer**
Examples:
- The relation defined by cleaker.me/? is the identity relation for all namespaces under cleaker.me
------
## **A5 — Existence Relation**
An existence relation **E** maps any viewer namespace to a base existence namespace:
**E(N_viewer) = N_existence**
Examples:
- The relation defined by jabellae.cleaker.me/ maps any viewer namespace to jabellae.cleaker.me/
------
## **A6 — Semantic-to-Routing Resolver**
The **.me** language expresses **semantic paths**; Cleaker resolves them into **routing targets**.
Formally, define a resolver **S → R** that maps a semantic path to a concrete network route.

Example:
- **Semantic (.me):** `cleaker.me/@username/device/suiGNMacBookAir/PORT/profile`
- **Routing (Cleaker):** `username.cleaker.me:suiGNMacBookAir:8161/profile`

Interpretation:
- **.me** defines the meaning (device, PORT, namespace, identity).
- **Cleaker** performs the resolution (semantics → routing).
- **Monad** persists the resulting ledger state.

This preserves a clean separation:
**language (meaning)** → **dictionary (resolver)** → **storage (ledger)**.

------
## **Conclusion**
This algebraic framework provides a structured way to understand and manipulate namespaces and relations within the **.Me** system. By defining namespaces as regions and relations as functions, we can reason about their interactions and refinements systematically.

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

## The model

**Identity exists in relation to something else**. There is no meaningful `.me` floating in the void. There is only **`.me in context`.**

```
cleaker()     → fixes the current namespace context 
cleaker(me)   → mounts this .me into that context
```

Not: `identity = user + config`

But:

`subject = cleaker(me)` This is why **cleaker** appears so early in the stack. It is not a utility. It is the founding operation.

------

## Core forms

```ts
cleaker()
// Fixes the current namespace context.
// The runtime, monad, or host surface already knows the namespace
// (hostname, domain, surface). Cleaker crystallizes it as a root.

cleaker(me)
// Takes a .me that already carries its own expression
// and mounts it into the current namespace tree.
// No username needed separately — .me already knows its own expression.
```

These are the semantic base forms of Cleaker. They express the core idea directly: `cleaker()` fixes context, and `cleaker(me)` places identity into that context.

## Operational form

There is also a practical triad form used by the current implementation:

```
cleaker(me, { namespace, secret, origin })
// Opens the vault against the given namespace, hydrates the kernel
// from its memory ledger, and returns a ready node.
```

This should be read as an implementation convenience of the current system state, not as the primary semantic form. The conceptual center remains `cleaker()` and `cleaker(me)`.

------

## Remote pointer

```ts
import cleaker from 'cleaker';
const ptr = cleaker("me://ana.cleaker.me:read/profile");
// ptr.__ptr.resolution.status === 'unresolved'
// A semantic pointer definition. No kernel needed.
```

A remote pointer is a target definition — an address in `me://` grammar that can be resolved later, passed around, or used to establish a connection. It does not require a bound kernel.

------

## Context mounting — `cleaker(me)`

```ts
import cleaker from 'cleaker';
import Me from 'this.me';

const me = new Me();
me.profile.name('Ana');

const node = cleaker(me);

// Local reads go directly to the kernel — instant.
node.profile.name; // 'Ana'

// Remote paths return a pending token — no kernel modification.
const pending = node.friends.bob.cleaker.profile;
pending.status;   // 'pending'
await pending.promise; // resolves against the server, then teaches the kernel
```

**Cleaker** does not mutate `.me` internals. It operates as a contextual node over the kernel and calls the public `me.learn(memory)` interface exactly once per remote resolution. The kernel learns. Cleaker does not reach inside.

------

## Operational triad form — `cleaker(me, { namespace, secret })`

As a practical implementation form, you can also pass namespace and secret at bind time so the vault opens automatically. No manual `.open()` call required:

```ts
import cleaker from 'cleaker';
import Me from 'this.me';

const me = new Me();
const self = cleaker(me, {
  namespace: 'ana.cleaker.me',
  secret: 'luna',
  origin: 'http://localhost:8161',
});

await self.ready;

self.profile.name; // value from remote memory, learned locally
```

`self.ready` is a `Promise<OpenNodeResult | null>`. It resolves when hydration completes, or rejects silently (`null`) on error.

You can also open explicitly:

```ts
const result = await self.open({ namespace: 'ana.cleaker.me', secret: 'luna' });
// result.status === 'verified'
// result.memoriesCount === N
```
