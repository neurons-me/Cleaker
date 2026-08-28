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

Nothing past step 2 is built. This document is the boundary marker between "we understand the
gap" and "we've closed it" — do not read §3's claim shape as implemented; it's the target §3
was written to build toward.

## See also

- [Namespace-Is-Context.md](./Namespace-Is-Context.md) — §4 (claim ledger) and §5 (anchored vs.
  context-following), the two ideas this doc combines.
- `modules/monad/Typescript/src/http/selfMapping.ts` — `ensureCleakerIdentityConfig()`, the
  already-solid keypair persistence this doc builds on.
- `modules/monad/Typescript/src/claim/records.ts` — `claimNamespace()`, the mechanism §3 proposes
  reusing rather than duplicating.
- `modules/netget/Typescript/src/modules/NetGetX/OpenResty/lua/handlers/surface_proxy.lua` — the
  trust-tier code §4 distinguishes from real verification, and where §4's enforcement would land.
- `CLAUDE.md`'s "Known architectural gaps" — gap #1 and #2, corrected 2026-08-28 to match what
  this doc found by reading the actual code, rather than the older, now-stale description.
