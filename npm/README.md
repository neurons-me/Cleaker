<img src="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1760758662/this.me-removebg-preview_fvyeda.png" alt="CLEAKER" width="188" height="188">

# CLEAKER
> *Resolutio ante directionem; nomen ante locum.*
> שם קודם למקום

`cleaker` is the namespace-first network layer for `.me`.

𝕌 = the set of all possible namespaces. The name is resolved before the place is selected.

If `.me` is the local semantic kernel, `cleaker` is the glove that wraps it:
- gives it a namespace identity
- opens a vault of past memories
- teaches those memories back into the kernel without touching its internals

## ∴ Core Idea

Three forms define the stack:

```ts
cleaker("ana.cleaker:read/profile")       // remote pointer — NRP grammar
cleaker(me)                               // kernel binding — wraps a .me instance
cleaker(me, { namespace, secret })        // triad — bind + open in one call
```

- `.me` resolves what **is** in the local tree.
- `cleaker(...)` resolves what **is remote** or binds the local kernel to the network.
- `NRP` is the transport grammar that makes remote semantic branches addressable.

## ⟁ Install

```bash
npm install cleaker
```

## ⟐ Remote Pointer

```ts
import cleaker from 'cleaker';

const ptr = cleaker("ana.cleaker:read/profile");
// ptr.__ptr.resolution.status === 'unresolved'
```

## ⟐ Kernel Binding

`cleaker(me)` wraps a `.me` instance in a facade that intercepts remote paths without touching the kernel:

```ts
import cleaker from 'cleaker';
import Me from 'this.me';

const me = new Me();
me.profile.name('Ana');

const node = cleaker(me);

// local reads go directly to the kernel — instant
node.profile.name; // 'Ana'

// remote paths return a pending token — no kernel modification
const pending = node.friends.bob.cleaker.profile;
pending.status;  // 'pending'
await pending.promise; // resolves against the server, then teaches the kernel
```

The kernel learns exactly one memory per remote resolution. The wrapper never mutates `.me` internals; it calls the public `me.learn(memory)` interface.

## ⟁ Triad Binding — Zero Friction Identity

Pass `namespace` + `secret` at bind time and the vault opens automatically in the background.
No manual `.open()` call required:

```ts
import cleaker from 'cleaker';
import Me from 'this.me';

const me = new Me();
const self = cleaker(me, { namespace: 'ana.cleaker', secret: 'luna' });

// optionally wait for hydration
await self.ready;

// kernel is now hydrated from the vault — reads are immediate
self.profile.name; // value from remote memory, learned locally
```

`self.ready` is a `Promise<OpenNodeResult | null>`. It resolves when the auto-open completes or rejects silently (null) on error. You can also open explicitly:

```ts
const result = await self.open({ namespace: 'ana.cleaker', secret: 'luna' });
// result.status === 'verified'
// result.memoriesCount === N
```

## ⟁ Sovereign Learning Loop

This is the core invariant of the alpha:

```
cleaker(me, { namespace, secret })
  → opens vault
  → server returns memories[]
  → cleaker deduplicates by hash
  → calls me.learn(memory) for each new memory
  → kernel reconstructs its semantic tree from history
  → if you close and reopen: same result, deterministically
```

**`.me` is pure.** It has no knowledge of cleaker, servers, or networks. `me.learn()` is an intrinsic capability of the kernel — it accepts a `{ path, operator, expression, value }` record and replays it into the index. Cleaker is the cable. The ledger is the long-term memory. The kernel is the brain.

**Indestructibility:** restart the kernel, call `cleaker(me, { namespace, secret })` again, and the kernel reconstructs its exact prior state from the vault.

## ⟁ Walkthrough Demo (.me Tree + Cleaker Ledger)

The package includes a demo test that mirrors a full `.me` tree walkthrough (identity, profile, users, pointers, filters) and hydrates a fresh kernel through triad binding.

Run it with:

```bash
npm run test:sovereign-loop
```

The test proves semantic equivalence between:
- source kernel state built through normal `.me` writes
- target kernel state reconstructed only from ledger memories through `cleaker`

## 𝔊 NRP Grammar

Canonical target grammar:
```txt
[prefix.]constant:selector/path
```

Examples:
```txt
ana.cleaker:read/profile
vault.cleaker:secret/wallet.balance
social.neurons:query/posts[author == 'ana']
```

Layer meaning:
- `[prefix.]constant` → namespace identity
- `:selector` → capability / semantic port
- `/path` → branch or executable semantic expression

Canonical URI form:
```txt
nrp://ana.cleaker:read/profile
```

## ⊂ Alpha State

Implemented:
- NRP target grammar + parser
- Remote pointer contract + explicit states
- Kernel binding (non-invasive glove over `.me`)
- Triad auto-open (`cleaker(me, { namespace, secret })`)
- `node.ready` — awaitable hydration promise
- Sovereign learning loop — deduplicated hydration via `me.learn()`
- Claim + open server flow (cleaker server)
- ESM / CJS / TypeScript build coverage
- Real end-to-end integration against live server

Not yet:
- Namespace discovery bootstrap
- Signed namespace records (public key flow)
- WebSocket propagation
- Watch / reactive sync semantics

## Claim and Verify

The current claim/open flow lives in the cleaker server and provides the trust anchor for replay hydration.

### How it works

1. Claim a namespace
- Endpoint: POST /claims
- Input: namespace, secret, optional publicKey
- Output: identityHash bound to that namespace, and encrypted noise stored server-side

2. Write memory entries
- Endpoint: POST /
- If namespace is claimed, writes are accepted only when they match claim identity or pass signature verification.
- Accepted payloads are appended to blocks and also persisted as memories in chronological order.

3. Open and recover state
- Endpoint: POST /claims/open
- Input: namespace + secret
- Server verifies derived identityHash against claim record
- On success, response includes:
  - noise
  - memories[] ordered by timestamp ASC
  - openedAt

This gives a boot sequence with deterministic recovery:
- noise restores derivation context
- memories restore semantic history

### Request examples

Claim:

```bash
curl -s -X POST http://localhost:8161/claims \
  -H "content-type: application/json" \
  -d '{
    "namespace": "ana.cleaker",
    "secret": "luna",
    "publicKey": "-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----"
  }'
```

Write a memory event:

```bash
curl -s -X POST http://localhost:8161/ \
  -H "host: ana.cleaker" \
  -H "content-type: application/json" \
  -d '{
    "identityHash": "<claim-identity-hash>",
    "expression": "set(profile.displayName, \"Ana\")",
    "payload": {"profile": {"displayName": "Ana"}}
  }'
```

Open with replay hydration:

```bash
curl -s -X POST http://localhost:8161/claims/open \
  -H "content-type: application/json" \
  -d '{
    "namespace": "ana.cleaker",
    "secret": "luna"
  }'
```

Expected shape:

```json
{
  "ok": true,
  "namespace": "ana.cleaker",
  "identityHash": "...",
  "noise": "...",
  "memories": [
    { "payload": {"expression": "..."}, "identityHash": "...", "timestamp": 1773175390500 },
    { "payload": {"expression": "..."}, "identityHash": "...", "timestamp": 1773175390601 }
  ],
  "openedAt": 1773175390601
}
```

### Verification behavior

- Wrong secret in open -> CLAIM_VERIFICATION_FAILED
- Unknown namespace in open -> CLAIM_NOT_FOUND
- Write into claimed namespace without valid association/signature -> NAMESPACE_WRITE_FORBIDDEN

## Test Examples and Results

Reference test file:
- core/cleaker/server/tests/claim_test_verification.ts

What the test covers:
- verified path: claim + open with correct secret returns original noise
- rejected path: claim + open with wrong secret returns CLAIM_VERIFICATION_FAILED

Run:

```bash
cd core/cleaker/server
npm run build
npm test
```

Observed result:

```txt
PASS claim_test_verification.verified
PASS claim_test_verification.failed
All claim verification tests passed.
```

## ∴ Tests

```
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
```

Run:

```bash
npm run build
npm run test
npm run docs:api
npm run docs:dev
```

## 𝕌 Mental Model
- `.me` **thinks** — pure local semantic kernel, algebra, memory log
- `cleaker` **propagates** — wraps the kernel, owns the network boundary
- `NRP` **names** — formal grammar so pointers travel without host-first routing

The binding is the identity. The vault is the continuity. The kernel is the brain that reconstructs itself from history.

## By Neurons.me
License: MIT
- https://cleaker.me
- https://neurons.me
