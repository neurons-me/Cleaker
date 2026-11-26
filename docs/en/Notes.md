---
layout: gui-doc
title: "Notes"
description: "The working notebook of cleaker: phrases, concepts, the grammar on one page, statuses, what the code still lacks, and what to read and run next."
mepath:
  - text: Cleaker
    url: https://neurons-me.github.io/Cleaker/
  - text: Docs
    url: https://neurons-me.github.io/Cleaker/docs/
canonical: https://neurons-me.github.io/Cleaker/docs/en/Notes.html
crumb: notes
related:
  - The-Model.html
  - The-Algebra-of-Me.html
  - Statuses.html
  - The-Flat-Universe.html
---
# Notes

The notebook of cleaker: the phrases that carry the idea, the concepts in one place, the grammar on a single page, what the code still lacks, and what to read and run next. Short on purpose; each part points to the page that develops it.

---

## Phrases

> **Resolution before direction. Name before place.**
> *Resolutio ante directionem; nomen ante locum.* · שם קודם למקום

- **Who am I, here.** The question cleaker answers.
- **Identity exists in relation to something else.** There is no `.me` floating in the void, only `.me` in context.
- **The singularity is .me.** Everything grows out of it.
- **Cleaker does not create identity. It mounts it.**
- **The kernel learns. Cleaker does not reach inside.** It calls `me.learn(memory)` once per remote resolution.
- **.me is syntax. cleaker is protocol.**
- **Change the space, change the branch. Change the seed, change the universe.**
- **A host is never, by itself, a namespace.**
- **Where you are is not what you are in.**
- **Secrets are holes in the map, not flags in a DB.**
- **Your existence is not required for reality to be valid.** A system that exists without you can welcome you without needing you.
- **If you can compute it, you cannot lose it.**

---

## Concepts

| Concept | In one line |
|---|---|
| **namespace** | A public name, and a constant: its seed is the name, its identity hash anyone can compute. The axis. |
| **.me** | The kernel: expressions evaluated in your own process. Syntax, no network, no authority. |
| **cleaker** | The protocol: mounts a `.me` on a namespace and turns its expressions into `me://` addresses. |
| **mount** | `cleaker(me, namespace)`: the `.me` becomes the root of a tree on that axis (`keys`, `wallet`, `contacts`, …). |
| **who** | A `.me` built with a who and a secret can `prove()`; an anonymous `.me` can only look. |
| **claim** | The key anchored for a namespace. The only thing that authorizes a write; the identity hash never does. |
| **audience** | Who can open a value: `∪`, `∩` (shares), `A \ x` (at sealing), `{self}` = a secret scope `_()`. |
| **surface** | The page or host you are looking from. It shows a namespace and grants nothing inside it. |
| **transport / door** | How a request arrives (scheme, host, port). A door is not a smaller namespace. |
| **position** | `namespace @ surface`, for example `cleaker.me @ neurons-me.github.io`. |
| **`/` and `/?`** | `/` is the namespace without anyone looking; `/?` binds it to a self that can prove. |
| **remote pointer** | `cleaker("me://ana.cleaker.me:read/profile")`: an address, resolved later. |
| **monad selector** | `me://suign.neurons.me[monadlisa]/profile` changes where it executes, never what it means. |
| **surface identity** | The same claim primitive, for a server: "this server is who it says it is" as a verifiable claim (design). |

---

## The grammar on one page

```txt
me://<namespace>[<context>]:<operation>/<path>

<handle>.<root>            ≡   <root>/@<handle>
me.<path>(value)           →   me://<namespace>:write/<path>
me("<path>")               →   me://<namespace>:read/<path>
```

```txt
namespace = base [ '[' context ']' ]? [ ':' operation ]? [ '/' path ]?
base      = label ('.' label)*
context   = kv ('|' kv)*          kv = key ':' value
```

```txt
cleaker.me[host:localhost|protocol:http|port:8161]:open/profile
  → base cleaker.me · context { host, protocol, port } · operation open · path profile
```

The context in brackets is transport and execution detail: it never changes which namespace is meant.

---

## Function and component

The same operation at two ends.

| | `cleaker(me)` | `<Me><Cleaker /></Me>` |
|---|---|---|
| **Starts from** | a `.me` that already carries its identity | a namespace: a `.me` that carries only that |
| **Does** | mounts the `.me` and returns the node (`claim`, `signIn`, …) | draws the way in: QR, connect, sign in, register, recover |
| **Ends with** | a subject, mounted | a session whose kernel is mounted with `cleaker(me, { namespace })` |
| **Needs** | the kernel in your hands | someone in front of the screen |

---

## Statuses, in short

`cleaker.me reachable · 73 ms · public, no who` — the namespace, the state of its host, the time to `/__bootstrap`, and who is looking.

| QR | Means |
|---|---|
| `idle` | nothing was checked |
| `checking` | loading, or pinging the host |
| `confirmed` | the host answered (reachable; nobody signed in) |
| `off` | nothing answers at this address |
| `error` | something answered and refused, or cleaker could not run |

Underneath: per host `transport` (up / down) and `triad` (verified / unverified / failed / skipped); per node `state` and `overall` (healthy / degraded / offline). The full page: [Statuses](./Statuses.html).

---

## Identity, as it works today

- **Registering makes 12 words.** The identity root comes from them; cleaker never receives the words, the root or the secret.
- **The root is kept encrypted in the browser** (a vault per namespace, opened with your secret). Browser storage is per address: `cleaker.me` and `www.cleaker.me` do not share it.
- **Signing in is a proof**, signed with a key derived from the root and checked against the key anchored in the claim.
- **On another browser or device**, there is no vault there: use Recover with the 12 words.

---

## Where the code is behind the model

- `.me` refuses a namespace without a who (`new Me({ namespace })` throws `ACTIVE_EXPRESSION_REQUIRED`); the model says a namespace exists without one.
- An anonymous `cleaker(me)` does not read `profile.rootNamespace` yet (`cleaker(me, namespace)` already works).
- There is no `overall` state for "public, reachable, no who": an anonymous visit reports `degraded`.
- npm has `cleaker@4.0.0`; the anonymous `cleaker(me, namespace)` fix is on `main`, unpublished.
- `cleaker()` with no arguments is the conceptual base form, not implemented.

---

## Run it

<div class="doc-cards" markdown="0">
<a class="card" href="https://neurons-me.github.io/Cleaker/"><span class="card-kind">Cleaker</span><span class="card-title">The home QR</span><span class="card-desc">cleaker(me, "cleaker.me") for real, in your browser: reachable, public, no who.</span></a>
<a class="card" href="https://neurons-me.github.io/Cleaker/docs/en/The-Algebra-of-Me.html"><span class="card-kind">Cleaker</span><span class="card-title">Axioms, live</span><span class="card-desc">Ax1 identity hash, Ax4 namespace @ surface, Ax5 a forgery refused.</span></a>
<a class="card" href="https://neurons-me.github.io/Cleaker/docs/en/Statuses.html"><span class="card-kind">Cleaker</span><span class="card-title">Every QR status</span><span class="card-desc">The real QR.me in each status, in your theme.</span></a>
<a class="card" href="https://neurons-me.github.io/social-graphs/"><img src="https://neurons-me.github.io/.me/docs/assets/card-social-graph.webp" alt=""><span class="card-kind">.me demo</span><span class="card-title">Social Graphs</span><span class="card-desc">Identity, trust and relationships in one live graph.</span></a>
<a class="card" href="https://neurons-me.github.io/robots/"><img src="https://neurons-me.github.io/.me/docs/assets/card-robots.webp" alt=""><span class="card-kind">.me demo</span><span class="card-title">Robots That Understand Context</span><span class="card-desc">The same object means different things by who looks and where.</span></a>
<a class="card" href="https://neurons-me.github.io/smart-cities/"><img src="https://neurons-me.github.io/.me/docs/assets/card-smart-cities.webp" alt=""><span class="card-kind">.me demo</span><span class="card-title">Smart Cities</span><span class="card-desc">A city reacting as one connected graph.</span></a>
<a class="card" href="https://neurons-me.github.io/.wallet/paypal/split/"><img src="https://neurons-me.github.io/.wallet/assets/og/paypal-og.png" alt=""><span class="card-kind">.me demo</span><span class="card-title">.wallet Split</span><span class="card-desc">Split bills with others using PayPal .me.</span></a>
<a class="card" href="https://neurons-me.github.io/.me/docs/Running-your-CoffeeShops.html"><img src="https://neurons-me.github.io/.me/docs/assets/card-coffeeshops.webp" alt=""><span class="card-kind">.me demo</span><span class="card-title">Running your CoffeeShops</span><span class="card-desc">Public menus, reactive pricing, private ops: one graph.</span></a>
<a class="card" href="https://neurons-me.github.io/.me/docs/Hemisphere-Scale.html"><img src="https://neurons-me.github.io/.me/docs/assets/card-hemisphere.webp" alt=""><span class="card-kind">.me demo</span><span class="card-title">Hemisphere Scale</span><span class="card-desc">A million sensors; one flips; six recompute.</span></a>
<a class="card" href="https://neurons-me.github.io/.me/Demos/"><img src="https://neurons-me.github.io/.me/docs/assets/demos-cover.webp" alt=""><span class="card-kind">.me</span><span class="card-title">All .me demos</span><span class="card-desc">Every live example of the kernel.</span></a>
</div>

---

## Read next

**Cleaker:** [The Model](./The-Model.html) · [Cleaker](./Cleaker.html) · [The Algebra of .me](./The-Algebra-of-Me.html) · [Statuses](./Statuses.html) · [The Flat Universe](./The-Flat-Universe.html)

**Cleaker, in depth (TypeScript docs):** [Namespace Is Context](https://neurons-me.github.io/Cleaker/Typescript/typedocs/Namespace-Is-Context.html) (a host is never, by itself, a namespace) · [NRP Namespaces](https://neurons-me.github.io/Cleaker/Typescript/typedocs/NRP-Namespaces.html) (the grammar) · [Surface Identity Claims](https://neurons-me.github.io/Cleaker/Typescript/typedocs/Surface-Identity-Claims.html) (claims for servers, design)

**.me:** [Seed](https://neurons-me.github.io/.me/docs/Seed.html) · [Syntax](https://neurons-me.github.io/.me/docs/Syntax.html) · [Operators](https://neurons-me.github.io/.me/docs/Operators.html) · [Audiences](https://neurons-me.github.io/.me/docs/Audiences.html) · [Algebra of Contexts](https://neurons-me.github.io/.me/docs/Algebra-of-Contexts.html) · [me:// URI](https://neurons-me.github.io/.me/docs/me-uri.html)

**Essays:** [The Algebra of Encrypted Audiences](https://neurons-me.github.io/encrypted-audiences/) · [Cryptographic Set-Chemistry](https://suign.github.io/SetChemistry.html) · [Namespace Protocol Resolution](https://neurons-me.github.io/NRP/Namespace-Protocol-Resolution.html)

**Where it runs:** [monad](https://neurons-me.github.io/monad/) (the mesh) · [netget](https://neurons-me.github.io/netget/) (where a monad physically runs)
