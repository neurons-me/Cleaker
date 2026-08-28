# Namespace Is Context

**neurons.me / suiGn**
**Status:** Canon. Sharpens [The Model](./The-Model.md)'s `space`/`namespace` distinction and
[NRP-Namespaces.md](./NRP-Namespaces.md)'s grammar with one rule that was previously implicit
and inconsistently applied: **a host is never, by itself, a namespace.**
**License:** CC0 1.0 Universal — Public Domain

---

## 0. The one-sentence version

A namespace is a *designated* context — a ledger of paths and references — and a host is only
ever the physical surface a request happened to arrive through; conflating the two lets every
machine that ever runs a monad silently mint its own namespace, which is the opposite of what
`cleaker()` — "fixes the current namespace context" — is for.

## 1. Four terms, not two

| Term | What it is | Example |
|---|---|---|
| **host** | Physical surface / transport. Where a request enters. | `local.host`, `suis-macbook-air.local`, `127.0.0.1` |
| **namespace** | Semantic context. A ledger — an addressable index of paths and references. | `cleaker.me`, `local.cleaker`, `jabellae.cleaker.me` |
| **path** | An address inside a namespace. | `hosts.suis-macbook-air.photos`, `groups.family.member.jabellae` |
| **value** | What lives at a path: data, a claim, a derivation, or a pointer. | `{ __ptr: "..." }`, a profile field, a claim record |

`.` composes **within** a namespace — real membership (`jabellae.cleaker.me` is one identity
inside `cleaker.me`'s tree). `/` connects **across** host, surface, app, and path — a relation,
never membership. `jabellae.suis-macbook-air.local` reads as valid `.`-composition but is a
category error: it dot-joins a subject onto a *host*, not a namespace. The correct shape for
"who is this, at this physical machine" is `<host>/@<user>` (a relation) — and that relation,
alone, resolves to nothing: there is no ledger at a bare host to write it into. See §3.

## 2. Namespaces are designated, not derived

The bug this doc closes: `getRootNamespace()` / `normalizeNamespaceRootName()` /
`resolveNamespace()` (in `modules/monad/Typescript/src/`) currently derive a monad's "root
namespace" directly from whatever physical hostname it happens to run on
(`ME_NAMESPACE` / the `Host` header). That makes every host that ever runs a monad into a new,
ad-hoc namespace — the exact contamination `local.host` was carved out to avoid (`local.host` is
deliberately *not* `local.me`, precisely so a general-purpose local surface doesn't read as a
namespace of its own).

A namespace is not "whatever host is answering right now." It is a curated, designated context —
`cleaker.me` (public), `local.cleaker` (local-scope), `jabellae.cleaker.me` (one identity's own
context), `mexicoencuesta.com.mx` (a third-party designated space). A host can *serve* one or
many of these. It never *is* one by default.

```
host: local.host                          ← surface, not namespace
app: photos                                ← generic view, parameterized below
namespace: jabellae.cleaker.me             ← context being read
path: hosts.suis-macbook-air.photos        ← address within that context
```

Read aloud: *entering through this host, running this app, reading the context
`jabellae.cleaker.me`, at the path that points to photos physically held by the host
`suis-macbook-air`.* The same `photos` app, pointed at a different namespace, resolves and
renders completely different data — this is exactly `this.gui`'s existing pattern
(`BlocksTable`, `UsersTable`, `HostSurface`: one component, `endpoint`/`namespace` props decide
what it shows), just now named precisely.

## 3. Namespaces hold references, not the weight

Heavy data stays where it was produced — a host's local filesystem, its own kernel, mesh
storage, an encrypted blob, a phone, whatever physically holds it. The namespace never becomes a
Dropbox. What a namespace holds is the **resolvable shape**: `photos[]`, `people[]`,
`hosts.suis-macbook-air.photos → { __ptr: "..." }`. `{ __ptr }` is not a new mechanism —
`BlocksTable.tsx`'s `formatResolvedValue()` already renders it distinctly (a `→` arrow, `share`
icon) — this doc just names the pattern it was already built for: a namespace path resolves to a
pointer, and following that pointer is a separate hop, potentially against a different host
entirely.

This is also the answer to §1's "resolves to nothing" claim: `<host>/@<user>` alone has nowhere
to write, because a bare host carries no ledger. `<host>/@<user>.<namespace>` does — the write
lands in the *namespace's* ledger, not the host's, and the host is recorded (if at all) only as
one more path inside it (`hosts.<host>.*`), never as the ledger's root.

## 4. Two ledgers were being shown as one

Everything a namespace holds has, until now, rendered as a single undifferentiated list in the
Blockchain tab (`BlocksTable.tsx`). It is actually at least two kinds of entry, plus a third this
session's work already produced:

| Ledger | What it records | Concrete entries |
|---|---|---|
| **Claim ledger** (cleaker) | Identity ↔ context bindings — *"this `.me` reclaimed this namespace, with this proof, at this moment, from this surface."* Not content. The connective tissue [The Model](./The-Model.md) calls `cleaker(me)`. | `identityHash`, `publicKey`, `proof`, `openedAt`/`createdAt`, the `users.<handle>` pointer |
| **Content ledger** (namespace) | The namespace's own addressable tree — unlocked once the claim ledger has an established binding for it. | `profile.name`, `photos[]`, `hosts.<host>.photos`, `groups.*` |
| **Surface ledger** (host) | Self-reported telemetry about a *host*, not a user's content — see [Knowledge Graph](https://neurons-me.github.io/monad/Typescript/typedocs/KnowledgeGraph) §4. | `surface.host.cpu`, `surface.host.memory`, `surface.usage.*` |

`.me` holds identity with no context at all. `cleaker` is the ledger that connects `.me` to a
context — its job is recording *relations*, never storing "the stuff." The namespace's own
content ledger is what that relation unlocks. The host contributes storage, compute, and a
surface — never a ledger of its own.

```
.me kernel  = who
cleaker     = who ↔ context   (the claim ledger)
namespace   = context content (the content ledger)
host        = where execution happens (the surface ledger, self-report only)
```

A Blockchain-tab UI that means to represent this honestly should separate these three, not list
them as one undifferentiated stream — `Claim Events` / `Content Events` / `System · Host Events`.

## 5. Anchored apps vs. context-following apps

§2 established that a namespace can serve as the parameter for a generic app (`photos`,
resolving differently per `@user.namespace`). That is not universal — some apps must never
switch context, no matter what session happens to be active in the same browser. An
infrastructure-management surface like `local.netget` administering real DNS/domain records is
exactly this case: it must not start reflecting a *different* namespace's domains just because a
different `.me` logged into the same tab. Two shapes, not one:

```
App anchored:
  scope   = fixed at deployment/configuration — a real cleaker() claim of its own
  session = decides WHO may operate it (auth), never WHAT it operates on

App context-following:
  scope   = namespace passed explicitly, per call/render
  session = decides who is observing/operating within that explicit scope
```

`local.netget` is anchored — what fixes what it manages *should* be its own claimed identity (see
[Surface-Identity-Claims.md](./Surface-Identity-Claims.md), a design not yet implemented — today
"anchored" is only a configuration convention, not yet a cryptographic guarantee); a logged-in
session only ever gates permission, never scope. `local.cleaker` is a hybrid: its root is anchored (this
deployment's own claim ledger — the local blockchain, fixed), but *within* that fixed root,
`@user` is a real parameter (which claimed identity you're currently viewing/acting as).
`photos`, `BlocksTable`, `UsersTable` are pure context-following — every one of their target
namespaces already arrives as an explicit prop (`endpoint`/`namespaceRootUrl`), never inferred
from "whatever session happens to be active" — which is the same property that makes them safe to
reuse generically in the first place.

The failure mode this rule prevents: wiring an anchored app's data source to "the active
session's namespace" instead of to its own fixed claim. That silently turns a stable
infrastructure surface into something that drifts with whoever is logged in — the anchored/
context-following distinction exists specifically to catch that class of mistake before it ships.

## 6. What this doc is not

- Not a new grammar. [NRP-Namespaces.md](./NRP-Namespaces.md)'s parser already accepts
  `jabellae.suis-macbook-air.local` as valid *syntax* — that doesn't change. This doc says which
  forms are the *semantically correct* target for a real write, not which forms parse.
- Not a claim that hosts are unimportant. A host is where computation and storage actually
  happen — see §3. It simply isn't where a ledger's identity lives.
- Not (yet) a description of a cross-host published ledger. A namespace already implies "many
  hosts can write against the same context" — that is not a separate future feature layered on
  top, it is what §2's designation already means once more than one host serves the same
  namespace.

## See also

- [The Model](./The-Model.md) — `cleaker()` fixes context, `cleaker(me)` mounts identity into it;
  this doc sharpens what "context" is allowed to be.
- [Surface-Identity-Claims.md](./Surface-Identity-Claims.md) — design doc for making a surface's
  own claim (§5's "anchored" scope) cryptographically real, not just a configuration convention.
- [NRP-Namespaces.md](./NRP-Namespaces.md) — the grammar this doc's terms parse under.
- [Knowledge Graph](https://neurons-me.github.io/monad/Typescript/typedocs/KnowledgeGraph) — the
  surface ledger (§4 above) worked out in full, including why it's unsigned self-report.
- `modules/monad/Typescript/src/namespace/identity.ts`,
  `modules/monad/Typescript/src/http/namespace.ts`'s `resolveNamespace()` — where "namespace"
  is derived from a host today; the first code this doc's rule should be checked against.
