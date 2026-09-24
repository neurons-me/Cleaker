# Surface Identity Claims

**neurons.me / suiGn**
**Status: DESIGN.** Nothing in this document is implemented. It records a target shape and the
current gap against it, verified against real code on 2026-08-28 — not a shipped feature. Treat
every claim below about *current* code as fact-checked; every claim about the target state as a
proposal.
**License:** CC0 1.0 Universal — Public Domain

---

## 0. The one-sentence version

A namespace's claim ledger already lets a human `.me` prove "I am who I say I am, here" —
this doc proposes the same primitive for a *surface* (a monad, a netget instance, any running
service), so "this server is who it says it is" stops being a bare string in a JSON registry and
becomes the same kind of verifiable claim.

## 1. Where this actually starts (verified, not assumed)

It would be easy to assume surfaces need a stronger identity built from scratch. They don't — the
identity side is already solid; only the claim is missing.

`selfMapping.ts`'s `ensureCleakerIdentityConfig()` already:

- Generates a real Ed25519 keypair (`crypto.generateKeyPairSync("ed25519")`) for every surface
  that doesn't already have one.
- Persists it to `self.keys.json` (`chmod 0600`) so it survives restarts.
- Explicitly refuses to derive it from `SEED`/`NAMESPACE_SEED` — the code comment states the
  reason directly: that would make two monads sharing a namespace seed collide as the same
  surface identity, conflating "authority over the semantic namespace" with "identity of this
  runtime instance." Those are different things and the code already keeps them apart.
- The old SEED-derivation function (`deriveEd25519KeyPairFromSeed`, HKDF-SHA256 over the seed)
  is still in the file but has zero callers anywhere in `src/` — dead code, safe to delete
  separately from this work.

So: **every surface already has a strong, persistent, non-collidable identity keypair.** That was
previously documented in `CLAUDE.md` as an open gap ("surface key derivation bug") — it isn't,
as of this doc. The actual gap is narrower and sits one layer up.

## 2. The actual gap, precisely

```
surface keypair   — EXISTS   (§1)
surface claim     — MISSING  (§3)
proxy enforcement — MISSING  (§4)
```

A surface's keypair proves nothing about which namespace it's entitled to serve. Nothing today
binds `MONAD_PUBLIC_KEY`/`identityHash` to a specific namespace the way `claimNamespace()`
binds a human's key to `jabellae.cleaker.me`. A surface can *say* `metadata.namespace: "cleaker.me"`
in its own self-report and nothing checks whether it has any right to.

## 3. What a surface claim would look like

Reuse the exact mechanism that already exists for humans — `claimNamespace()` in
`modules/monad/Typescript/src/claim/records.ts` — rather than inventing a parallel one. A surface
claims a namespace the same way a person does: secret + proof, verified, persisted, hash-chained.
The only thing that changes is *who* is doing the claiming.

```
surface:   netget.site
identity:  <surface's own persistent identityHash, from §1's keypair>
claim:     netget.site  ↔  cleaker.me        (surface → designated namespace)
```

This is the same shape as [Namespace-Is-Context.md](./Namespace-Is-Context.md) §4's claim ledger
— "this `.me` reclaimed this namespace, with this proof, at this moment, from this surface" —
except the `.me` doing the reclaiming belongs to infrastructure, not a person. Hosts, apps,
surfaces, gateways: anything with a persistent keypair can `cleaker()` itself into a namespace.
Humans are not a special case of this mechanism — they were just the first user of it.

Once claimed, this is what makes §5 of Namespace-Is-Context.md's "anchored" scope
*cryptographically* real instead of a configuration convention someone could misconfigure or spoof
— `local.netget`'s claim to its own namespace becomes checkable the same way a user's claim is,
not just declared in a JSON file nobody verifies.

## 4. Why trust tiers are not this

`surface_proxy.lua` already has machinery that looks adjacent to this and isn't: a trust-tier
system (`owner > admin > peer > guest`, computed at registration time by `apps.lua`'s
`derive_trust()` against `gateway-claims.json`), plus a `WARNING` log when two live candidates at
the same trust tier disagree on `identityHash` for the same host. That's relative ranking among
whoever registered, not cryptographic verification of anyone's right to the namespace. The
question it answers is *"which of these registered candidates should I currently prefer?"* The
question a claim answers is different and stricter: *"does this identityHash hold an actual,
currently-valid claim for this namespace?"* Trust tiers can keep existing as a tiebreaker among
multiple surfaces that all hold **valid** claims to the same namespace (legitimate replicas) —
they were never meant to substitute for checking the claim exists at all, and today nothing does
that check.

## 5. The target test

The one that actually proves this closed — mirrors the adversarial, live-verified standard this
session's earlier claim-proof closure used (real `curl` against a running monad, not a unit test
in isolation):

```
same namespace string
same trust tier
different identityHash

today:   ngx.WARN, routing proceeds to whichever wins the trust/recency tiebreak
target:  reject — the candidate without a valid claim for this namespace never becomes `best`
```

This is the test that actually distinguishes "we rank registrations" from "we verify identity" —
today's code passes the first framing and fails the second. A future implementation is only done
when this specific scenario, run live, rejects instead of warns.

## 6. Phases (not started)

1. `namespace-is-context.md` (done) — anchored vs. context-following named as a rule.
2. This doc (done) — the gap named precisely: keypair exists, claim missing, enforcement missing.
3. Implement: a surface calls `claimNamespace()` for its own designated namespace using its
   already-persistent keypair (§1) as the claim identity, at bootstrap.
4. Implement: `surface_proxy.lua` (or the Node-side registration check feeding it) verifies a
   candidate's `identityHash` against an actual claim record for the namespace being served,
   before it's eligible to become `best` — trust tier remains a tiebreaker among valid claims only.
5. The §5 spoof test, run live against a real gateway, both before and after step 4, to
   demonstrate the actual behavior change (warn → reject).

Nothing past step 2 is built **in the specific shape this document proposes** (a surface
self-claiming its own namespace via its own persistent keypair, §3, then `surface_proxy.lua`
enforcing that at routing time, §4). Do not read §3's claim shape as implemented.

A related but distinct piece of progress happened 2026-09-12, worth naming precisely so it
isn't confused with §3-5 above: netget's gateway-setup claim flow (`gatewaySetupSession.ts`'s
`commitSignedClaim`) now verifies a real, currently-active keychain key + Ed25519 signature
against the namespace an *operator* is signed into, before trusting them as that gateway's
administrator — real cryptographic verification, not just trust-tier ranking. But this is
netget consulting an external operator's claim, not a surface claiming its own namespace as
this doc's §3 describes, and it does nothing for §4's routing-time enforcement gap (still
open, still gated the same way — see `CLAUDE.md`'s "Known architectural gaps" #2, updated
2026-09-12 to say exactly this). This document's own Phases table is otherwise unchanged.

## 7. Addendum — 2026-09-24: netget is a pointer, not an installation

**Status: DESIGN.** Nothing below is implemented, except where explicitly marked verified. This
addendum grew out of a long design conversation working forward from §1-6 above, and corrects one
real overreach that conversation initially made (§9) before arriving at the shape below.

### 7.1 The engine is liminal; the config is per-namespace

Two things kept getting conflated under the one word "netget": the **engine** — the OpenResty/Lua
process that physically holds sockets, certs, and the nginx worker, and does subtractive-synthesis
routing across every namespace currently anchored to this host (`monadIndex.ts`,
`meshSelect.ts`) — and the **declared configuration** a namespace wants that engine to act on
(which domain, which port, which cert). The engine is genuinely cross-namespace by necessity — it
has to see all anchored trees to route at all, the same reason a host-owner view (`monads` CLI,
subtractive synthesis) is legitimately different from a single participant's view. The
configuration is not — it is ordinary data belonging to one namespace, exactly like any other
branch that namespace already owns.

**Target shape:** `<namespace>.netget.*` (domains, ports, cert requests, the app registry) is
plain tree data under that namespace's own root, governed by the *same* write-authorization every
other write to that namespace already requires —
`isNamespaceWriteAuthorized()` against `getClaim(namespace)` (`replay.ts` / `records.ts`), nothing
new. The engine reads across every namespace's `.netget` branch the same way it already reads
across every entry in the mesh index — it was never "inside" one namespace's tree to begin with,
so nothing about scoping configuration this way changes what the engine can see.

### 7.2 Doors are pointers, not separate installations

`netget.site`, `cleaker.me`, `local.cleaker`, `local.host` are not four different kinds of thing —
each is a namespace, and which namespace currently *answers* as a given door is a `__ptr`
resolution, the same operator already documented as `.me` operator #1 (`isPointerCall`,
`Typescript/typedocs/Operators.md`) and already proven live elsewhere in this exact codebase:
`records.ts`'s `materializeProjectedNamespaceClaim()` already writes
`{ __ptr: namespace }` at `daemon.users.<host>.<username>` to resolve a handle to its full
namespace. A door pointer is the identical shape, one level up: `netget.main.server -> <namespace
currently serving as the main door>`. Reading `netget.site.domains` and reading through the
pointer both land on the same node — not two systems that happen to agree, one node reached two
ways. Repointing a door is one signed `__ptr` write by whoever holds the pointer's containing
branch, never a data migration and never a manual nginx edit.

**Verified, not proposed:** this is not a new idea invented in this addendum. Branch
`migration/main-server-doors` (`modules/netget/Typescript`, commit `a7595e3`, 2026-09-20 —
committed locally, not yet pushed/deployed) already implements exactly this: domain records carry
a `namespaceId`, `namespaceIdentity.ts` and `lua/lib/main_server.lua` resolve a door by identity
rather than by hostname, and an older door registered without an identity is pointed at one — "no
hostname defines the namespace; the state names it by `{id, label}`." This addendum's §7.2 is a
restatement of already-committed work, not a new proposal — it's included here because it's the
piece that makes §7.1 and §3-4 consistent with each other (see §7.3).

### 7.3 Why this replaces the free-floating `gatewayId`

§3-4 above and this session's earlier design pass both reached for a *separate* ledger keyed
independently of any namespace — `gatewayAuthority.ts`'s `GatewayAuthorityRecord`, keyed by a
free-standing `gatewayId` string, and (in-conversation only, never written to this doc) a proposed
`ServeDelegationRecord` with the same shape. Both repeat the same mistake: a `gatewayId` (or a
delegation record) that is *related to* a namespace via a guard function
(`isNamespaceLocalToThisInstallation`) instead of *being* that namespace's own branch invites the
two drifting apart — two ids resolving to one namespace, or a guard that must never be wrong
instead of a structural impossibility.

Once doors are pointers (§7.2) and configuration is namespace-scoped (§7.1), the reason
`gatewayAuthority.ts` gives for its separate storage — "a gateway's authority belongs to the
INSTALLATION... transferring ownership must never require moving state into a different user's
personal branch" — still deserves an answer, but not a parallel ledger: a namespace's claim is
today single-owner/all-or-nothing (`records.ts` has no multi-admin or transfer concept), and that
gap is real. The fix is a `<namespace>.netget.delegates` branch — same vigencia/autorización split
`gatewayAuthority.ts` already proved out (`getKeychainKey(...).authorization === "active"` +
membership check against the branch's own state, signed via `isNamespaceWriteAuthorized`, nonce
anti-replay) — but keyed by the namespace itself, not by an independent id. Multi-admin and
delegation become a capability every namespace has, not a netget-specific side-ledger.

### 7.4 The concrete, small fix — still first in line

Independent of §7.1-7.3, `meshAnnounce.ts:166`'s `isNamespaceUsableByIdentity()` compares the
announced `identityHash` — documented in three places in this codebase as a public, non-secret
fingerprint — against `claim.identityHash`, when what the signature actually proves possession of
is `public_key`. `ClaimRecord.publicKey` already exists (`records.ts:249`) and is never
cross-checked here. Binding the check to `claim.publicKey === entry.public_key` (ownership case)
or membership in `<namespace>.netget.delegates` (delegated-serve case, §7.3) closes a real,
presently-exploitable gap in shipped code with no new storage and no new crypto primitive — this
remains the first implementation step, unchanged from the order agreed earlier in this
conversation: (1) this fix, (2) the `.netget.delegates` write shape, (3) the same check ported to
the local `/apps/report` path and to a WS edge node's first connect, (4) the `/netget` window
gated by resolving the main-server pointer (§7.2) to a namespace and checking that namespace's own
claim/delegates, (5) WS tunnel multiplexing at the mothership, last, on top of an already-verified
claim — never before it.

### 7.5 Closing framing

Under this shape, `.me` is closer to a semantic programming language than a database: a path is
resolved, not looked up, and everything — a door, `netget`, an endpoint, a device — is a name that
means only what it currently points to or claims. `netget` is not a privileged keyword; it is one
more name that happens, today, to point at a namespace running an OpenResty/Lua engine, the same
way `->` lets any other name point at any other tree. Naming a path *is* the only interface to
whatever structure materializes it — a monad process, cleaker's namespace resolution, an
OpenResty worker — nothing about the language changes to reach any of them; only what the name
currently resolves to does.

## See also

- [Namespace-Is-Context.md](./Namespace-Is-Context.md) — §4 (claim ledger) and §5 (anchored vs.
  context-following), the two ideas this doc combines.
- `modules/monad/Typescript/src/http/selfMapping.ts` — `ensureCleakerIdentityConfig()`, the
  already-solid keypair persistence this doc builds on.
- `modules/monad/Typescript/src/claim/records.ts` — `claimNamespace()`, the mechanism §3 proposes
  reusing rather than duplicating; `materializeProjectedNamespaceClaim()`, the live precedent §7.2
  generalizes.
- `modules/netget/Typescript/src/modules/NetGetX/OpenResty/lua/handlers/surface_proxy.lua` — the
  trust-tier code §4 distinguishes from real verification, and where §4's enforcement would land.
- `modules/monad/Typescript/src/http/meshAnnounce.ts` — `isNamespaceUsableByIdentity()` (§7.4),
  already-shipped cross-host claim-conflict checking that §4 did not know existed when first
  written.
- `modules/monad/Typescript/src/claim/gatewayAuthority.ts` — the vigencia/autorización split §7.3
  reuses; its free-standing `gatewayId` is what §7.3 argues against keeping as a separate ledger.
- Branch `migration/main-server-doors` (`modules/netget/Typescript`, commit `a7595e3`) —
  already-committed, not-yet-deployed implementation of door-as-pointer (§7.2).
- `Typescript/typedocs/Operators.md` (`.me` kernel repo) — operator #1, `isPointerCall`, the
  primitive §7.2 and §7.5 rest on.
- `CLAUDE.md`'s "Known architectural gaps" — gap #1 and #2, corrected 2026-08-28 to match what
  this doc found by reading the actual code, rather than the older, now-stale description.
