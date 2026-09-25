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
claim:     netget.site  ↔  <surface's own identity>        (surface → its own namespace)
```

**Note, added 2026-09-24 (see §7.3):** the line above was originally written as
`netget.site ↔ cleaker.me`, implying a surface could self-claim a namespace *other* than its own.
That's wrong and now corrected here directly, not just annotated — this mechanism (self-claim via
`claimNamespace()`) only ever covers a surface's **own** designated namespace. A surface serving a
*different*, already-claimed namespace (the `netget.site` ↔ `cleaker.me` case this example used to
show) is never a self-claim — it requires the `cleaker.me` claim holder to have delegated that
right, per §7.3. Do not read this section as licensing a surface to claim a namespace it doesn't
already own.

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

### 7.6 Risks carried forward, not yet resolved

Three things the shape above does not itself solve — named so they aren't lost between this
addendum and whoever implements it:

**Two ledgers at once.** For as long as `daemon.gateways.<gatewayId>` (`gatewayAuthority.ts`) and
`<namespace>.netget.delegates` (§7.3) both exist, something will keep writing to the old one out
of habit or unfamiliarity with this addendum. §7.3 argues the old ledger should stop being used
for new installs; it does not yet say what happens to an *already-bootstrapped* `gatewayId` record,
and that migration/deprecation path — not indefinite coexistence — needs its own design pass before
implementation starts, not after.

**Liminal is not the same as public.** The engine (§7.1) can see every namespace's `.netget`
branch because it has to, to route at all — that is a *capability*, not a *license*. Reading
`<namespace>.netget.*` through the `/netget` window, or relaying it to a WS mothership client
(§4/§7.4's future work), still has to go through the same disclosure contract every other read of
that namespace does (`pathResolver.ts`'s public/closed envelope) — the engine's structural
position outside every namespace's tree does not exempt it from that namespace's own privacy
rules.

**Unclaimed namespaces need a harder rule off loopback.** `isNamespaceUsableByIdentity()`'s
`if (!claim) return true` (§7.4) is fine on the local, loopback-only path — physical access to the
machine already implies a trust boundary. On an open remote/WS registration endpoint it is not:
without a stated policy, "whoever announces an unclaimed namespace first, wins" becomes exactly
the race a signed first-claim (§3, tightened by the note above) exists to prevent. §7.4's
implementation order already assumes this gets resolved before step 3 (WS first-connect) ships;
this paragraph makes that assumption an explicit, named requirement rather than an implicit one.

### 7.7 `.netget.delegates`: shape, and the write-path gaps it depends on closing first

**Status: prerequisites CLOSED (2026-09-24, monad commits `71126411`, `909f170e`, `6ab01be0`; GUI
commit `7522bea8`) — see §7.8 for what the closure work actually found, including one gap that
remains open. The `.netget.delegates` shape below is still not implemented; only the write-path
gaps it depends on are closed.**
Everything in this section was checked directly against `handlers/commandHandler.ts`'s
`rootCommandHandler` (the generic namespace-write surface every plain write, including a future
`.netget.delegates` write, goes through). Three real gaps were found there, not hypothesized —
without closing them first, this shape would be actively unsafe, not just incomplete.

**Purpose**, unchanged from the shape sketched earlier in this conversation: `<namespace>.netget.
delegates` answers "who besides the namespace's own claim holder may serve this namespace's
traffic, or write its `.netget.*` config, without holding the claim's own private key?" — read by
`meshAnnounce.ts`'s `isNamespaceUsableByIdentity()` fix (§7.4) and by any future delegate-authored
write to `<namespace>.netget.*`.

**Prerequisite 1 — the unclaimed-namespace bypass is real, not theoretical.**
`rootCommandHandler` (`commandHandler.ts:226`) reads `const claim = getClaim(namespace)`, then
gates the signature check behind `if (claim) { ... }` — for a namespace with no claim, that whole
block is skipped and the write proceeds using `body.identityHash` taken **unverified, straight
from the caller** (`commandHandler.ts:239-241`). Nothing stops a write to `netget.delegates` for
an unclaimed namespace today, and `meshAnnounce.ts` would read it as a real delegation. The fix has
an exact precedent two guards above it in the same function: `isKeychainReservedPath()` and
`isGatewayAuthorityReservedPath()` (`commandHandler.ts:204-216`) already reserve certain paths so
they 403 unconditionally, before the `if (claim)` gate, rather than falling through it. `netget.
delegates` (arguably all of `<namespace>.netget.*`) needs the identical reserved-path treatment —
copy the pattern, don't invent a new one.

**Prerequisite 2 — `isNamespaceWriteAuthorized()` has no replay or namespace binding.**
Verified directly in `replay.ts`: the function signs `toStableJson(stripWriteAuthFields(body))` —
no nonce, no timestamp, and `namespace` is never part of the signed payload (it comes from
`resolveNamespace(req)`, outside the signature entirely). Two consequences, both real: (a) a
previously-valid signed grant can be replayed at any later time — including *after* a revoke, since
§7's original design deleted the delegate entry on revoke but never made the grant's own signature
single-use, so replaying the old grant body silently restores a revoked delegate; "a repeated grant
is harmless" (this doc's own earlier framing) is wrong for exactly this reason, corrected here. (b)
if one key holds claims on two different namespaces, a signed write meant for one could be replayed
against the other, since nothing in the signature ties it to a specific namespace.

Fix: bind the signed payload to `{ ...fields, namespace, expectedHeadHash }`, where
`expectedHeadHash` is the signing moment's own read of that namespace's current chain head (the
latest entry's `.hash` from `getMemoriesForNamespace(namespace)`, already real, already
hash-chained per axiom A8). The server rejects the write if the chain has moved since. This makes
every signature valid for exactly one write, in one namespace, at one moment — no nonce cache to
maintain. Tradeoff worth stating plainly: a legitimate concurrent writer racing another write to
the same namespace gets a stale-head rejection too and must re-sign against the new head — acceptable
given a claim has exactly one owner, so genuine concurrent writers are rare by construction, not
absent.

**Prerequisite 3 — delegates must not be able to grant delegates.**
The second use case (§7's own purpose) requires `isNamespaceWriteAuthorized`'s caller to eventually
accept a *delegate's* key, not just the claim holder's, for writes under `<namespace>.netget.*`.
`netget.delegates` is itself under that prefix — without an explicit carve-out, a delegate holding
any write-shaped scope could grant itself (or anyone) more delegates, escalating past whatever scope
it was actually given. `netget.delegates` must stay owner-key-only, unconditionally, enforced as an
allowlist ("only these exact paths accept a delegate signature at all; everything else denied") —
never a blocklist that only excludes what someone thought to name.

**The corrected shape**, incorporating all three fixes plus two smaller corrections:

```ts
interface NetgetDelegateEntry {
  publicKey: string;   // SPKI DER→PEM, same conversion convention as records.ts's
                        // rawEd25519PublicKeyToPem() (prefix 302a300506032b6570032100) —
                        // reused for consistency, not reinvented.
  scopes: string[];     // opaque, same convention as gatewayAuthority.ts's grants.
  grantedAt: number;
  grantedBy: string;    // identityHash of the claim holder at grant time — informational audit
                         // trail only; authority is always re-derived from getClaim() at check
                         // time, never cached from this field.
  label?: string;       // human-readable, informational.
}

// Map key: sha256 hex of the SPKI DER bytes (not the PEM text — whitespace/newline variance
// would make the same key hash differently). Server recomputes this from `publicKey` on every
// write (rejecting a mismatched map key) and on every read (never trusts the stored key blindly).
type NetgetDelegates = Record<string, NetgetDelegateEntry>;
```

Dropped the earlier `namespace` field from the record entirely — it only ever repeated what the
kernel path already encodes unambiguously, and a namespace that disagreed with its own storage
location would just be a bug with no principled way to pick a winner.

**Left open, not decided here:** what `me://<namespace>/netget/delegates` discloses to an
unauthenticated reader through the same public/closed envelope `pathResolver.ts` already
implements (three classifications — `public`, `closed`, `not_found`; `closed` deliberately
indistinguishable from stealth on the wire). Public keys reveal nothing sensitive; a `label` like
`"mothership-1"` can reveal real infrastructure topology. Needs its own decision before this ships,
not an assumption baked into the shape.

**Closes the loop on §7.6's earlier verifiability discussion — corrected, not as first written.**
Verified directly in `memoryStore.ts`: the `.me` kernel's `hash`/`prevHash` fields are a single
**global** chain (`getKernel().memories`, one sequence for the whole kernel, axiom A8's own
"hash-chain integrity across all memories" phrasing was literal) — not one chain per namespace.
`getNamespaceChainHead()` (§7.8) constructs its own namespace-*projected* view (the last entry
whose path resolves under that namespace, filtered from the global list) to get a value that
changes exactly when that namespace's own data changes — which is the real property replay
protection needs — but the entry actually written by that signed request does **not** carry that
projected value as its own literal `prevHash` (its real `prevHash` links to whatever else was
globally most recent, possibly a different namespace's write). So: the anti-replay mechanism is
correct and live-verified (§7.8's tests), but "this signed head is a state commitment, provable by
replaying the namespace's own chain from genesis" overstated it — there is no literal namespace-
scoped chain to replay; there is a projection this function recomputes fresh each time. A real
per-namespace, replayable state commitment is a design this doc doesn't claim to have built.

### 7.8 Closing the two prerequisites — what the actual implementation found

**Status: CLOSED for the scope below; one gap explicitly left open, not silently accepted.**
monad commits `71126411` (prerequisite 1, netget.* reserved-path guard), `909f170e`
(prerequisite 2, chain-head binding on `rootCommandHandler`), `6ab01be0` (both, ported to
`commitHandler` after review found it was the only write path checked); GUI commit `7522bea8`
(the one real production signer, `createCleakerSession.ts`'s `signAndWrite`, updated to match).

**Every other write entry point was audited, not assumed safe.** `appendSemanticMemory()`'s own
callers were grepped exhaustively: `session.ts`, `claims.ts`, `usageLedger.ts`,
`hostTelemetryLedger.ts`, `Blockchain/users.ts`, `keychain.ts`, `records.ts`,
`claimSemantics.ts`, `semanticBootstrap.ts` all write to hardcoded or internally-derived paths,
never an attacker-chosen one — none share the exposure. `commitHandler` (`POST /api/v1/commit`)
was the one real exception: it already had the keychain/gateway-authority/routing-record guards,
but neither the netget.* guard nor chain-head binding, and was fixed to match.

**A real, live-reproducible bug was found while testing this, not a test-harness quirk.**
`getNamespaceChainHead()`'s first version was contaminated by `hostTelemetryLedger.ts`/
`usageLedger.ts`, which write `surface.host.*`/`surface.usage.*` into the monad's own namespace on
an interval/per-request basis. When a claimed namespace IS the monad's own self identity — the
exact `netget.site` self-claim case §7.3 describes as the target shape — this telemetry noise
moved that namespace's chain head out from under a legitimate signed write between the client's
read and its write landing, producing a spurious `STALE_HEAD` reliably, not rarely. Fixed by
excluding the `surface.` prefix from the head computation.

**Left open, deliberately, not silently:** `expectedHeadHash` binds to the *caller's own*
claimed namespace. A commit whose event targets a *different* namespace — `commitHandler`'s own
shared-group-root case, where a caller writes into a namespace nobody individually owns — never
moves the caller's own head, so replaying such a commit is not yet rejected. A test
(`commitGate.test.ts`, "KNOWN GAP") asserts today's actual behavior and says explicitly to invert
the assertion once this is closed, rather than passing silently. Closing it needs per-event or
joint-namespace-set head binding — a harder design than this pass attempted.

**Two decisions surfaced, not made unilaterally:**
- The single-process assumption: `rootCommandHandler`'s check-then-write has no `await` between
  reading the head and writing, so two concurrent requests can't interleave — but this is a
  single-Node-process guarantee only. If the monad ever runs as a cluster or multiple instances
  over shared storage, two writes against the same head could both land. Not resolved here;
  recorded as an explicit assumption. The alternative, if it's ever needed, is a storage-level
  unique constraint on `(namespace, prevHash)` rather than an application-level check.
- `GET /api/v1/write-head` is unauthenticated and public: anyone can observe *that* a namespace's
  state just changed (a changing hash), never *what* changed. Left as-is for now — narrower than
  the existing public `namespace-owner` endpoint already discloses — but worth naming as a choice
  rather than an oversight.

### 7.9 Two more real gaps a review surfaced, both closed; two host-visibility precisions

**Status: CLOSED (monad commit `70d964f7`).**

**The `surface.*` exclusion (§7.8) created a new replay hole.** Anything the head computation
excludes also never moves the head an external caller's signature could be checked against — so a
signed write to `surface.*` would have stayed valid to replay indefinitely, the same class of gap
as the multi-namespace one, except this one was introduced by the fix itself rather than pre-
existing. Closed by reserving `surface.*` to internal callers only (`isSurfaceTelemetryReservedPath`
+ the existing internal-token check, same pattern as `isGatewayRoutingRecordPath`) in both write
paths. **General rule, worth keeping:** any prefix excluded from head computation must also be
write-restricted to internal callers — the exclusion alone is never sufficient by itself.

**A genuinely more severe, previously-unexamined vulnerability**, found by asking what a root-
claim-signed write with `path: "users.alice.profile.email"` actually does. The monad's own root
namespace resolves to an *empty* kernel prefix (`namespaceToKernelPrefix`), so such a write is
never further prefixed — the literal path lands at the exact kernel location Alice's own claim
resolves to. Confirmed live, not reasoned about: a real claim + real signature + real HTTP round
trip overwrote Alice's real `profile.email` with a forged value, using only the root's own
signature. `isForeignUsersPrefixWrite()` (`kernel/manager.ts`) now rejects this in both write
paths as `CANNOT_WRITE_ANOTHER_NAMESPACES_STORAGE`.

**Host-owner visibility (§7.1/§7.8) needed two precisions, not assumptions:**
- *"Sees what exists, not its content" is a property of the resolver, not the machine.*
  `memoriesForPrefix("")` filtering out `users.<label>.<deeper path>` is a read-side filter. The
  underlying storage is one file on one disk; whoever controls that disk can read it directly,
  outside the resolver entirely. Only genuinely *encrypted* data (the identity-vault design's
  secrets) is actually safe against a host with physical/filesystem access — unencrypted data is
  not, regardless of what the resolution interface chooses to expose. State this precisely: the
  host owner sees what exists by design, and could read unencrypted content via physical access —
  not the same claim as "sees nothing."
- *That the host owner sees the list of anchored namespaces at all is a decision, not an accident.*
  It's information about who uses that machine. Almost certainly the intended shape (§7.1's whole
  point), but naming it as a chosen tradeoff rather than a side effect, the same way the public
  `write-head` endpoint (§7.8) is named as one.

**Corrected roadmap.** The original §7.4 gap — `meshAnnounce.ts`'s `isNamespaceUsableByIdentity()`
comparing `identityHash` (a public, non-secret fingerprint) instead of the signing `public_key` —
is still open and does not depend on `.netget.delegates` existing, and nothing above blocks it
either. Next, in order: (1) the `meshAnnounce.ts` `publicKey` fix, (2) the commit-handler multi-
namespace head-binding gap (§7.8, tracked live via an `it.todo()` in `commitGate.test.ts`, not a
silently-green test), if it becomes load-bearing before WS edge nodes ship, (3) `.netget.delegates`
itself, last, once its write surface has nothing else left unverified underneath it.

**Noted, not urgent:** telemetry writing into the same semantic memory chain as user data (rather
than its own, separate store) is why the `surface.*` exclusion was needed in the first place, and
makes the global chain grow without bound on every request. Moving telemetry out of the semantic
chain entirely would make the exclusion (and this whole class of gap) unnecessary — a real
simplification, but a bigger change than this pass attempted.

### 7.10 Four more questions, checked before touching `meshAnnounce.ts`

**Status: CLOSED for three; one left as an explicit, unresolved decision (monad commit `764ea739`).**

1. **The read side, verified live, not assumed safe by symmetry with the write fix.** Does
   `GET users.alice.profile.email` through the root host also leak Alice's data? Traced and
   tested — it does **not**, today, but only as a side effect of `memoryToRow()` rewriting a
   matched row's own `path` field (stripping the owning namespace's prefix) before the branch tree
   a read builds from it — never a guard written for this purpose. §7.9's own "sees what exists,
   not content" claim was correct on this specific point, but by accident, not by design. Made
   structural instead of incidental: `pathResolver.ts` now calls the same `isForeignUsersPrefixWrite()`
   the write side uses, so this no longer depends on an unrelated function's internals staying the
   same for an unrelated reason.
2. **The guard generalized**, not left as a hardcoded `"users."` string. `namespaceToKernelPrefix()`
   only ever produces two shapes — `""` or `"<label>.<prefix>"` — so a literal check was a complete
   enumeration, not a guess, but `isForeignUsersPrefixWrite()` now builds from the exact same
   `NON_ROOT_KERNEL_PREFIX_LABEL` constant `namespaceToKernelPrefix()` itself uses, so the two
   structurally cannot drift apart later. Also surfaced a real, separate gap while doing this:
   `commitHandler`'s per-event guards (keychain/gateway-authority/netget/surface, and the new
   forgery guard) never canonicalized paths at all — the same slash-vs-dot bypass already closed on
   `POST /` was still open on `POST /api/v1/commit`. One shared `canonicalizeWritePath()`
   (`replay.ts`) now backs every guard in both files.
3. **Malformed paths rejected outright.** New `isMalformedWritePath()` rejects a `scheme://` prefix,
   a percent-encoded segment, and any run of 2+ separator characters (`..`, `//`, a leading or
   trailing separator) with `400 MALFORMED_WRITE_PATH` — checked on the RAW path, deliberately
   before `canonicalizeWritePath()`'s own filter step could silently drop the same shape (the
   actual kernel write path has no such filter; what the underlying `.me` kernel's own URI parsing
   does with a resulting empty segment was unverified, not confirmed safe). Runs before every other
   guard, in both write paths.
4. **The one-off test flake got a name, not a shrug.** `providerBootRoot.test.ts` and
   `requestedNamespace.test.ts` shared the literal root namespace `"acme.test"`, and the latter
   mutates `process.env.ME_NAMESPACE` globally in its own `beforeAll` (restored after, but real
   shared process state for the window in between) — vitest's module isolation resets each file's
   own module graph, never `process.env`. Renamed the shared namespace away; confirmed stable
   across 8 consecutive full-suite runs afterward (0 failures), against roughly 1-in-10 before.

**Left open, on purpose:** what the root claim is allowed to do to `groups.*` today. Groups live
under the shared root namespace itself, which the root claim already legitimately owns — so unlike
the `users.<label>.*` case, the root overwriting or deleting group data with its own signature may
be exactly the intended authority relationship, not a bug. The same question as §7.9's `users.*`
finding, but not the same answer by default; deciding it either way was out of scope for this pass.
Related and already tracked: while the multi-namespace-event replay gap (above, `it.todo()`) stays
open, group writes specifically are replayable through it (e.g. re-adding a member who was just
removed) — real groups usage raises that gap's priority, ahead of WS edge nodes, independent of
whatever `groups.*`'s root-authority question resolves to.

### 7.11 A sign-up fix surfaced a sharper version of §2's claim-secret question — one item left explicitly Open

Fixing a real bug (the sign-up flow wrote profile data unsigned to an unclaimed namespace instead of
calling the monad's own `POST /claims`) led to checking whether "the claim secret never leaves the
browser" actually holds. It does not, in the sense that matters: for the real browser path
(`deriveCleakerNode()` → `ME_RESEED(username, password)`), the `secret` a claim/open request sends to
the monad is the *same* `(username, password)` pair `deriveCompoundSeed()` turns into the compound
seed the Ed25519 signing key derives from — not merely "a credential the server happens to see," but
the seed material itself. `createSeedSession.ts`'s pre-existing `claim()`/`open()` do the same thing
more directly, sending the raw kernel seed. Full trace, the real local claims this affects, and the
proposed domain-separated-verifier fix are written up in
[`Identity-Namespace-Recovery-Audit.md` §12, item 7](../../../../typedocs/Architecture/Identity-Namespace-Recovery-Audit.md)
(monad repo) — not duplicated here since it's one finding, not two.

**Left Open, deliberately not touched by that fix:** `deriveCompoundSeed()` itself
(`me.ts:152-154`, `keccak256("me.seed/compound:v1::" + who + "::" + secret)`) is a single fast hash,
with no slow KDF (scrypt/Argon2) and no per-installation salt beyond the fixed, public domain string.
Two consequences, both already true today, independent of any claim-secret fix:

- Anyone who knows (or guesses) `who` — often a public username or handle — has an offline
  password-guessing target with no per-installation salt slowing them down: try a candidate
  `secret`, recompute the seed, check it against the one public thing every claim already publishes,
  the identity's `publicKey`. The public key is the oracle.
- Moving to a slow KDF changes every existing identity's derived seed — it is not a drop-in swap next
  to the domain-separated-verifier fix above; it invalidates keys, not just re-derives a side value.
  A separate decision, on a separate timeline, from the claim-secret question this section otherwise
  tracks.

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
- `modules/monad/Typescript/src/handlers/commandHandler.ts` — `rootCommandHandler` (§7.7), the
  generic namespace-write surface with the two real, verified gaps (unclaimed-namespace bypass,
  no replay/namespace binding) that block implementing `.netget.delegates` as specified.
- `modules/monad/Typescript/src/handlers/syncHandler.ts` — `commitHandler` (§7.8), the second
  write path found to share both gaps, with its own remaining multi-namespace-event limitation.
- `modules/monad/Typescript/src/claim/netget.ts` — `isNetgetReservedPath()` (§7.8), extracted from
  `commandHandler.ts` once `commitHandler` needed the identical check.
- `modules/monad/Typescript/src/resources/hostTelemetryLedger.ts`,
  `src/resources/usageLedger.ts` (§7.8) — the `surface.*` writers whose interval/per-request
  traffic into a monad's own namespace was found to spuriously invalidate that namespace's own
  chain head before `getNamespaceChainHead()` excluded them.
- `modules/monad/Typescript/tests/commitGate.test.ts`, `chainHeadWriteAuthorization.test.ts`,
  `netgetReservedPathAuthorization.test.ts` (§7.8) — the live-verified guarantees and the one
  test that documents the still-open multi-namespace-event gap on purpose.
- `modules/monad/Typescript/src/http/internalToken.ts` — `isSurfaceTelemetryReservedPath()` (§7.9),
  reserving `surface.*` to internal callers, the same pattern `isGatewayRoutingRecordPath()` already
  used for the gateway's own routing records.
- `modules/monad/Typescript/src/kernel/manager.ts` — `isForeignUsersPrefixWrite()` (§7.9), the fix
  for the root-claim-into-`users.<other>.*` forgery; sits beside `isForeignNamespaceCollapsingToRoot()`,
  the mirror-image gap it was written to close.
- `modules/monad/Typescript/tests/rootWriteDirectionCheck.test.ts` (§7.9) — the live-confirmed proof
  of the forgery, and the regression guard now closing it.
