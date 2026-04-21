<img src="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1773198145/cleaker_hpxk2f.png" alt="Cleaker SVG Image" width="144" height="144">

# CLEAKER
> *Resolutio ante directionem; nomen ante locum.*
> **שם קודם למקום**

## What cleaker is
Cleaker is a single question made computable:
> **Who are you, relative to where you are?**

`.me` is **who**.
`namespace` is **where**. 
`cleaker()` fixes the **where**.
`cleaker(me)` places **who** into that **where**.

That is the whole idea.

------

## The model
**Identity exists in relation to something else**. There is no meaningful `.me` floating in the void. There is only **`.me in context`.**

```ts
cleaker()     → fixes the current namespace context 
cleaker(me)   → mounts this .me into that context
```

Not:
`identity = user + config`

But:
`subject = cleaker(me)`

This is why **cleaker** appears so early in the stack. It is not a utility. It is the founding operation.

------

## Core forms

```ts
cleaker()
// Fixes the current namespace context.
// The runtime, monad.ai, or host surface already knows the namespace
// (hostname, domain, surface). Cleaker crystallizes it as a root.

cleaker(me)
// Takes a .me that already carries its own expression
// and mounts it into the current namespace tree.
// No username needed separately — .me already knows its own expression.
```

These are the semantic base forms of Cleaker. They express the core idea directly: `cleaker()` fixes context, and `cleaker(me)` places identity into that context.

## Operational form
There is also a practical triad form used by the current implementation:

```ts
cleaker(me, { namespace, secret, origin })
// Opens the vault against the given namespace, hydrates the kernel
// from its memory ledger, and returns a ready node.
```

This should be read as an implementation convenience of the current system state, not as the primary semantic form. The conceptual center remains `cleaker()` and `cleaker(me)`.

------

## Install

```bash
npm install cleaker
```

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

------

## The sovereign learning loop
This is the core invariant:

```
cleaker(me, { namespace, secret })
  → opens vault
  → server returns memories[]
  → cleaker deduplicates by hash
  → calls me.learn(memory) for each new memory
  → kernel reconstructs its semantic tree from history
  → close and reopen: same result, deterministically
```

`.me` is pure. It has no knowledge of cleaker, servers, or networks. `me.learn()` is an intrinsic capability of the kernel — it accepts a `{ path, operator, expression, value }` record and replays it into the index.
**Cleaker is the contextual boundary. The ledger is the long-term memory. The kernel is the brain.**
Restart the kernel, call `cleaker(me, { namespace, secret })` again, and the kernel reconstructs its exact prior state from the vault.

------

## Node-side usage
The same contract works server-side:

```ts
import cleaker from 'cleaker';
import Me from 'this.me';

const me = new Me();

// Bind only — local reads, remote delegation
const local = cleaker(me);

// Bind + open — hydrate from ledger
const self = cleaker(me, {
  namespace: 'ana.cleaker.me',
  secret: 'luna',
  origin: 'http://localhost:8161',
});

// Remote pointer — no kernel needed
const ptr = cleaker('me://ana.cleaker.me:read/profile');
```

`local` — contextual node over your kernel. `self` — same node, hydrated against a namespace vault. `ptr` — unresolved remote target definition.
This is why cleaker can sit underneath apps, servers, installers, and semantic bootstraps — not just browsers.

------

## `me://` grammar

```
me://<namespace>[<context>]:<operation>/<path>
```

Examples:

```
me://ana.cleaker.me:read/profile
me://ana[device:macbook|device:iphone;protocol:https]:read/profile
me://cleaker.me/users/ana:read/profile
```

Context operators:

| Operator | Meaning                                            |
| -------- | -------------------------------------------------- |
| `|`      | OR between resolution branches                     |
| `;`      | AND inside one branch                              |
| `,`      | expands into multiple OR branches for the same key |

Legacy: `nrp://` is still accepted as a parsing alias. Canonical serialized form is always `me://...`.

------

## Claim and verify

```
POST /claims        → claim a namespace
POST /claims/open   → open and recover state
POST /             → write a memory entry
```

**Claim:**

```bash
curl -s -X POST http://localhost:8161/claims \
  -H "content-type: application/json" \
  -d '{ "namespace": "ana.cleaker.me", "secret": "luna" }'
```

**Open:**

```bash
curl -s -X POST http://localhost:8161/claims/open \
  -H "content-type: application/json" \
  -d '{ "namespace": "ana.cleaker.me", "secret": "luna" }'
```

Response shape:

```json
{
  "ok": true,
  "namespace": "ana.cleaker.me",
  "identityHash": "...",
  "noise": "...",
  "memories": [
    { "payload": { "expression": "..." }, "identityHash": "...", "timestamp": 1773175390500 }
  ],
  "openedAt": 1773175390601
}
```

**Verification behavior:**

- Wrong secret → `CLAIM_VERIFICATION_FAILED`
- Unknown namespace → `CLAIM_NOT_FOUND`
- Write without valid association → `NAMESPACE_WRITE_FORBIDDEN`

------

## Tests

```bash
PASS Quickstart: remote pointer creation
PASS Demo:       bind + open + hydration + real network resolution
PASS A0–A3:      NRP target grammar axioms
PASS ALG0–ALG6:  namespace algebra / subset laws
PASS BNS0–BNS6:  browser namespace discrimination
PASS Bind:       kernel wrapping + remote delegation without kernel hooks
PASS Integration Real (1): cleaker(me) + actual this.me package + remote memory
PASS Integration Real (2): triad binding — auto-open + kernel hydration
PASS Builds:     ESM, CJS, TypeScript noEmit
PASS Contracts:  NRP serialization contract
npm run build
npm run test
npm run docs:api
npm run docs:dev
```

To run the sovereign loop demo:

```bash
npm run test:sovereign-loop
```

------

## Alpha state
**Implemented:**
- `me://` target grammar + parser
- Remote pointer contract + explicit states
- Context mounting — non-invasive contextual node over `.me`
- Operational triad auto-open — `cleaker(me, { namespace, secret })`
- `node.ready` — awaitable hydration promise
- Sovereign learning loop — deduplicated hydration via `me.learn()`
- Claim + open server flow
- ESM / CJS / TypeScript build coverage

**Not yet:**

- Namespace discovery bootstrap
- Signed namespace records (public key flow)
- WebSocket propagation
- Watch / reactive sync semantics

------

## The stack in one view

```ts
.me thinks — pure local semantic kernel, algebra, memory log
cleaker places — fixes namespace context, mounts .me into it, and owns the network boundary
me:// names — formal grammar so pointers travel without host-first routing
```

The placement is the identity in context. The vault is the continuity. The kernel is the brain that reconstructs itself from history.

------

**∴ Witness our seal** 

**suiGn / neurons.me**
