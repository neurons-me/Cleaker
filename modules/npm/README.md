<img src="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1760758662/this.me-removebg-preview_fvyeda.png" alt="CLEAKER" width="188" height="188">

# CLEAKER
> *Resolutio ante directionem; nomen ante locum.*
> שם קודם למקום

`cleaker` is the namespace-first network layer for `.me`.
𝕌 = the set of all possible namespaces.  
∴ the name is resolved before the place is selected.

If `.me` is the local semantic kernel, `cleaker` is the layer that lets semantic branches travel across the network without collapsing into host-first routing.

Let **N** be a namespace region.

```txt
N = { domain, subdomain?, port?, path?, bind? }
```

If **B** adds coordinates to **A**, then:

```txt
B ⊑ A
B ⊆ A
```

In `cleaker`, routing is a consequence of refinement over **𝕌**, not the starting point of resolution.

## ∴ Core Idea
Three forms now define the stack:

```ts
cleaker("ana.cleaker:read/profile")
me.friends.ana["->"](cleaker("ana.cleaker:read/profile"))
nrp://ana.cleaker:read/profile
```

- `.me` resolves what **is** in the local tree.
- `cleaker(...)` resolves what **is remote**.
- `NRP` is the transport grammar that makes remote semantic branches addressable.

## ⟁ Install
```bash
npm install cleaker
```

## ⟐ Import
```ts
import cleaker from 'cleaker';
```

## ⊑ Resolve with cleaker
```ts
import cleaker from 'cleaker';

const me = 'ana.cleaker:read/profile';
const expression = 'vault.cleaker:secret/wallet.balance';

const a = cleaker(me);
const b = cleaker(expression);
```

Result shape:

```ts
{
  __ptr: {
    kind: 'remote',
    identity: {
      prefix: 'ana',
      constant: 'cleaker'
    },
    intent: {
      selector: 'read',
      path: 'profile',
      mode: 'reactive'
    },
    resolution: {
      status: 'unresolved',
      namespaceRecordVerified: false,
      sessionToken: null,
      lastError: null
    },
    operationalState: {
      latencyMs: null,
      lastSync: null,
      cacheTtl: 300,
      stale: false
    },
    transport: {
      preferred: ['quic', 'https'],
      protocol: null,
      resolvedEndpoint: null
    }
  }
}
```

## ⟶ Low-level parser (optional)
```ts
import { parseTarget } from 'cleaker';
const target = parseTarget('ana.cleaker:read/profile');
```

Use `parseTarget(...)` only when you need raw grammar parsing for tooling or validation.
For normal usage, call `cleaker(...)`.

Parsed target shape:
```ts
{
  scheme: 'nrp',
  namespace: {
    prefix: 'ana',
    constant: 'cleaker',
    fqdn: 'ana.cleaker'
  },
  intent: {
    selector: 'read',
    path: 'profile',
    mode: 'reactive'
  }
}
```

## ⟐ Inject into `.me`
`cleaker` is not a hidden side effect inside `.me`.
It is an explicit network decision.

```ts
me.friends.ana["->"](cleaker("ana.cleaker:read/profile"));
```

That keeps the boundary clean:
- `.me` stays deterministic and local-first
- `cleaker` owns remote resolution
- network semantics are explicit in syntax

## 𝔊 Grammar
Canonical target grammar:
```txt
[prefix.]constant:selector/path
```

Examples:
```txt
ana.cleaker:read/profile
vault.cleaker:secret/wallet.balance
social.neurons:query/posts[author == 'ana']
dev.neurons:api/v1.users.get
```

Layer meaning:
- `[prefix.]constant` -> namespace identity
- `:selector` -> capability / semantic port
- `/path` -> branch or executable semantic expression

Canonical URI form:
```txt
nrp://ana.cleaker:read/profile
```

## ⊂ Current Package Scope
Implemented now:
- NRP target grammar
- target parser
- remote pointer contract
- explicit pointer states
- namespace resolver contracts
- transport contracts for HTTP / WS
- ESM / CJS / TS build coverage

Not implemented yet:
- namespace discovery bootstrap
- signed namespace records
- real NRP handshake
- WebSocket propagation
- `.me` runtime hydration from remote branches
- sync / replay / watch semantics

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

The package currently ships with:
- semantic axioms
- algebra / subset laws
- browser namespace discrimination
- build compatibility checks
- NRP contract checks

Run:

```bash
npm run build
npm run test
npm run docs:api
npm run docs:dev
```

## 𝕌 Mental Model
- `.me` thinks
- `cleaker` propagates
- `NRP` gives the propagation a formal grammar

Or more concretely:
- `.me` generates the branch delta
- `cleaker` resolves and transports it
- remote pointers let another tree consume it without pretending the network is local magic

## By Neurons.me
License: MIT
- https://cleaker.me
- https://neurons.me
