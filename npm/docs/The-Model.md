# The Model

**Identity exists in relation to something else.** There is no meaningful `.me` floating in the void. There is only **`.me in context`.**

```
cleaker()     → fixes the current namespace context
cleaker(me)   → mounts this .me into that context
```

Not: `identity = user + config`

But: `subject = cleaker(me)`

This is why **cleaker** appears so early in the stack. It is not a utility. It is the founding operation.

The seed is the whole truth. The space is where that truth is mounted. The namespace is the contextual branch that becomes addressable.

```
root .me seed
  └── space: neurons.me
        └── namespace: suign.neurons.me

root .me seed
  └── space: sui-desk.local
        └── namespace: suign.sui-desk.local
```

Wherever you go, state the same seed. The namespace changes by context. The truth does not.

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

These are the semantic base forms of Cleaker. `cleaker()` fixes context; `cleaker(me)` places identity into that context.

## Operational form

There is also a practical triad form used by the current implementation:

```ts
cleaker(me, space)
// Mounts name + space as a namespace branch, then can signIn
// from its memory ledger, and returns a ready node.
```

This is an implementation convenience of the current system state, not the primary semantic form. The conceptual center remains `cleaker()` and `cleaker(me)`.

## Remote pointer

```ts
import cleaker from 'cleaker';
const ptr = cleaker("me://ana.cleaker.me:read/profile");
// ptr.__ptr.resolution.status === 'unresolved'
// A semantic pointer definition. No kernel needed.
```

A remote pointer is a target definition — an address in `me://` grammar that can be resolved later. It does not require a bound kernel.

## Context mounting

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

**Cleaker** does not mutate `.me` internals. It calls the public `me.learn(memory)` interface exactly once per remote resolution. The kernel learns. Cleaker does not reach inside.

## Operational triad — `cleaker(me, { namespace, secret })`

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

`self.ready` is a `Promise<OpenNodeResult | null>`. Resolves when hydration completes, rejects silently (`null`) on error.
