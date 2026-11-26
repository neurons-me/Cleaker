---
layout: gui-doc
title: "The Model"
description: ".me is syntax, cleaker is protocol. The where lives in the .me tree, cleaker turns it into me:// addresses, and a namespace exists without a who."
mepath:
  - text: Cleaker
    url: https://neurons-me.github.io/Cleaker/
  - text: Docs
    url: https://neurons-me.github.io/Cleaker/docs/
canonical: https://neurons-me.github.io/Cleaker/docs/en/The-Model.html
crumb: the model
related:
  - Cleaker.html
  - Statuses.html
  - The-Algebra-of-Me.html
  - /.me/docs/me.html
  - /.me/docs/Syntax.html
---
# The model

> **Change the space, change the branch. Change the seed, change the universe.**

**Identity exists in relation to something else**. There is no meaningful `.me` floating in the void. There is only **`.me in context`.**

```
cleaker(me, namespace)   → mounts this .me into that namespace
cleaker(me)              → the namespace comes from inside .me
```

Not: `identity = user + config`

But:

`subject = cleaker(me)` This is why **cleaker** appears so early in the stack. It is not a utility. It is the founding operation.

## Two layers: syntax and protocol

`.me` and cleaker are not two versions of the same thing. They are two layers.

- **`.me` is syntax.** Expressions evaluated inside your own process: `me.profile.name("Ana")`. No network, no authority. It is your memory, so there is nobody to ask for permission.
- **cleaker is protocol.** It takes a `.me` expression and turns it into an address that can leave your process: an NRP target, `me://<namespace>:<operation>/<path>`.

```
me.profile.name("Ana")   →  me://cleaker.me:write/profile.name   value: "Ana"
me.profile.name          →  me://cleaker.me:read/profile.name
```

The value (`"Ana"`) is not a path segment; it travels with the write. The path keeps its dots after the slash.

This is also why the **contract** lives in cleaker and not in `.me`. A local expression needs no authority. Authority only matters when an expression crosses into a namespace that lives somewhere else, and that crossing is exactly what cleaker does.

## The where lives in the .me tree

The namespace is not something cleaker glues onto `.me` from outside. It is part of the `.me` tree, stored as data like any other value:

```
me.namespace   → ana.cleaker.me     (where this .me is mounted: who + root)
me.namespace   → cleaker.me         (no who: the root itself)
```

One field, at the top of the tree: **where this `.me` is mounted**. The root is not stored apart; it is derived (the namespace minus the who). `profile.rootNamespace` and `profile.namespace` are still written, for older readers, and are deprecated.

- **`.me` keeps the where in its tree**, as one more value.
- **cleaker reads that where and turns it into protocol**: `me://cleaker.me:read/...`.

So both forms are valid:

```ts
// The where is given to cleaker
const node = cleaker(me, 'cleaker.me');

// The where comes from inside .me
const me = new Me('ana', secret, { namespace: 'cleaker.me' });
const node = cleaker(me);   // reads me.namespace: ana.cleaker.me

// ...with or without a who
const guest = new Me(undefined, { namespace: 'cleaker.me' });
cleaker(guest);             // cleaker.me, read-only
```

Both forms need `this.me` 4.4.0 and `cleaker` 4.0.1 or later.

A `.me` whose expression is already a full name (`"suiGn.neurons.me"`) also carries its own namespace: `cleaker(me)` reads it directly.

## A namespace exists without a who

> Existence **before** identity. Identity **before** session. *(see [Cleaker](./Cleaker.html))*

A namespace does not need anyone signed in to exist. `cleaker.me` is `cleaker.me` before anyone enters it.

```ts
const node = cleaker(new Me(), 'cleaker.me');   // anonymous .me
node.getStatus().activeNamespace;               // 'cleaker.me'
await node.validateHosts();                     // GET https://cleaker.me/__bootstrap → up
```

An anonymous `.me` bound to a namespace resolves to that namespace's root. It can **look**: it reaches the hosts and reads what is public. It cannot **act**: signing in and claiming still require a `.me` that can `prove()`, which means a who. An anonymous node only sends reads; it never posts anything.

That gives three states for one namespace:

| Form | Who | What it can do |
|---|---|---|
| `cleaker(new Me(), 'cleaker.me')` | nobody | read what is public |
| `cleaker(new Me('ana', secret), 'cleaker.me')` | ana | sign in, read and write as ana |
| no cleaker at all | — | the namespace still exists; nobody is looking |

## Namespace @ surface

The page you are on is not the namespace. It is the **surface** the namespace is seen from.

```
cleaker.me @ neurons-me.github.io/Cleaker
```

reads as: *the namespace `cleaker.me`, seen from the surface `neurons-me.github.io/Cleaker`.* Two channels: the namespace (what) and the location (where you are looking from). Being on a page grants nothing inside the namespace; the door never changes what an identity may do.

The surface is the **exact place**: host, path, query and section. A place has to be one you can return to. A highlight on one section of one page, shared with a friend, has to lead them back to exactly there:

```ts
node.position().expression;   // 'cleaker.me @ neurons-me.github.io/Cleaker#notes'
node.position().full;         // 'cleaker.me @ "https://neurons-me.github.io/Cleaker#notes"'
```

`position()` reads the page's location on every call, so it follows you as you move. Without a page (Node) it is just the namespace. Only noise is dropped: a trailing `/` and `index.html`. The scheme is written only when it is news (`http` on a public host). Long places are for the drawing to shorten; the value is never shortened. Needs `cleaker` 4.0.2 or later.

## Core forms

```ts
cleaker(me, namespace)
// Mounts this .me into that namespace.
// With a who: can sign in. Without one: the namespace's root, read-only.

cleaker(me)
// The namespace comes from inside .me: its full-name expression,
// or me.namespace, set with new Me(who?, secret?, { namespace }).

cleaker('me://ana.cleaker.me:read/profile')
// A remote pointer: an address, no kernel needed.
```

`cleaker()` with no arguments, "fix the context the runtime already knows", is the conceptual base form. **It is not implemented** in the current code: every form takes a `.me` or a target.

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

## Signing in — a .me that can prove

Signing in is not a password sent to a server. It is a **proof**: the `.me` signs a challenge with a key derived from its seed and its active expression. Only a `.me` built with a who can do that:

```ts
import cleaker from 'cleaker';
import Me from 'this.me';

const me = new Me('ana', secret);          // who + secret → can prove()
const self = cleaker(me, 'cleaker.me');    // signs in automatically

await self.ready;
self.profile.name; // value from remote memory, learned locally
```

`self.ready` is a `Promise<OpenNodeResult | null>`. It resolves when hydration completes, or resolves to `null` on error.

You can also sign in explicitly:

```ts
const result = await self.signIn({ namespace: 'ana.cleaker.me' });
```

The secret never goes to cleaker and never leaves `.me`. cleaker only ever receives the signed proof.

------

## Where this stands (2026-11-26)

The model above is ahead of the code in a few places:

- **No state for "public, reachable, no who".** Status has `healthy` (a who was verified) and `degraded`. An anonymous visit to a reachable namespace reports `degraded`, as if something were wrong.
- **Host discovery.** Besides the declared namespace, cleaker also probes `http://localhost` on purpose, to find the visitor's own local monad. In a browser, it can also list the page's own origin as a candidate host of the namespace.
- **Unowned namespaces.** Proposed contract: a namespace with no owner bound through cleaker is read-only. Writes enter only through a contract (a signed who, or a server key the owner delegated to).
- **Versions.** A namespace without a who, inside `.me` or given to cleaker, works from `this.me` 4.4.0 and `cleaker` 4.0.1. Older versions refuse it (`this.me` throws `ACTIVE_EXPRESSION_REQUIRED`) or do not read it.
- **`profile.rootNamespace` / `profile.namespace`** are deprecated but still written: they go once every reader uses `me.namespace` (the `this.gui` bundles still carry a cleaker that reads `profile.rootNamespace`).
- **One mount for now.** A `.me` can live in several namespaces, so `me.namespace` will become a collection; that waits until `.me` paths can hold a segment with dots (`cleaker.me`) without reading it as nesting.

