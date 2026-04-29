## The model
**Identity exists in relation to something else**. There is no meaningful `.me` floating in the void. There is only **`.me in context`.**

```
cleaker()     → fixes the current namespace context 
cleaker(me)   → mounts this .me into that context
```

Not: `identity = user + config`

But:

`subject = cleaker(me)` This is why **cleaker** appears so early in the stack. It is not a utility. It is the founding operation.

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
