---
layout: gui-doc
title: "Statuses"
description: "What cleaker reports about a namespace: the line under the QR (reachable, did not answer), and underneath it the host, proof and node states cleaker itself keeps."
mepath:
  - text: Cleaker
    url: https://neurons-me.github.io/Cleaker/
  - text: Docs
    url: https://neurons-me.github.io/Cleaker/docs/
canonical: https://neurons-me.github.io/Cleaker/docs/en/Statuses.html
crumb: statuses
scripts:
  - /assets/qr-statuses/qr-statuses.js?v=4
related:
  - The-Model.html
  - Cleaker.html
---
# Statuses

<div data-live="QrStatuses"></div>

The [Cleaker home](https://neurons-me.github.io/Cleaker/) runs `cleaker(me, "cleaker.me")` with an anonymous `.me` and writes what happened under the QR:

```
cleaker.me reachable · 73 ms · public, no who
```

Read it left to right:

| Part | Meaning |
|---|---|
| `cleaker.me` | the namespace that was resolved |
| `reachable` | the state of the namespace's host (below) |
| `73 ms` | how long `GET https://cleaker.me/__bootstrap` took, from this browser |
| `public, no who` | who is looking: nobody. The `.me` is anonymous, so the node can read what is public and nothing else |

## The line under the QR

| State | Line | QR | What happened |
|---|---|---|---|
| loading | `connecting to cleaker.me…` | checking | the npm builds of `this.me` and `cleaker` are downloading and their sha256 is being checked |
| checking | `connecting to cleaker.me…` | checking | `validateHosts()` is pinging the host |
| **reachable** | `cleaker.me reachable · N ms · public, no who` | confirmed | `https://cleaker.me` answered `/__bootstrap` |
| unreachable | `cleaker.me did not answer` | off | the host did not answer: a network error, or no answer within 8 s |
| error | `could not run cleaker: …` | error | a build failed to load, or its sha256 did not match |

**Reachable is not signed in.** "Confirmed" on the QR means the namespace answered. Nothing was signed, claimed or written: the visitor has no who.

## How each status looks

The QRs at the top of this page are the real QR.me component, drawn in this page's theme: change the theme or light / dark in the top bar and they follow it.

- **`idle`** and **`confirmed`** keep the QR's own colour. What tells them apart is the dot at the start of the label: grey for `idle`, green for `confirmed`.
- **`checking`** uses the theme's warning colour.
- **`off`** is grey: **nothing answers** at this address.
- **`error`** uses the theme's error colour: **something answered and refused**, or cleaker could not run. A namespace that is simply not running is `off`, not `error`.

On the home page the dot is covered by the padlock, so there `idle` and `confirmed` look the same and the line under the QR is what tells them apart.

The padlock on the QR is a different fact: the transport of the **page you are on** (HTTPS with a certificate the browser accepted, or not). It says nothing about the namespace.

## What cleaker keeps underneath

The line is a summary. `node.getStatus()` returns the full picture, in three layers.

### Per host: transport

Can this host be reached at all?

| `transport` | Meaning |
|---|---|
| `unknown` | not probed yet |
| `up` | `GET <host>/__bootstrap` answered |
| `down` | it did not (`NETWORK_ERROR`) |

### Per host: triad (proof)

Did this host accept a proof from this `.me`?

| `triad` | Meaning | Typical `error` |
|---|---|---|
| `verified` | signed in: the host accepted the proof and the memories were hydrated | — |
| `unverified` | no proof was accepted, without anything being wrong | `PROVE_UNSUPPORTED` (anonymous `.me`, no who), `CLAIM_NOT_FOUND` (the who has no claim on this namespace) |
| `failed` | the host refused the proof | the host's error code |
| `skipped` | another host already verified first (`first-success`) | — |

### Per node: state and overall

`state` is where the node is in its cycle:

```
idle → discovering → probing → opening → hydrating → ready
                                                    → degraded
                                                    → offline
```

`overall` is the verdict:

| `overall` | Meaning |
|---|---|
| `healthy` | at least one host is `verified` |
| `degraded` | hosts were tried, none is `verified` |
| `offline` | no namespace, or no host to try |

## The anonymous visit, layer by layer

For the line `cleaker.me reachable · 73 ms · public, no who`:

```
https://cleaker.me   transport: up     triad: unverified (PROVE_UNSUPPORTED)
node                 state: degraded   overall: degraded
```

`degraded` is cleaker's honest answer to "is anyone verified here?" (no), not a fault. cleaker has no `overall` state yet for **public, reachable, no who**, so the home page reads the host's `transport` directly and says *reachable*. A state of its own for that case is an open proposal (see [The Model](./The-Model.html), "Where this stands").

## Only the declared host

cleaker's discovery also lists the page's own origin and `http://localhost` (to find the visitor's own local monad). The home page declares `https://cleaker.me` and refuses every other origin before a request exists, so a public page never probes a visitor's localhost. Those refused candidates are left out of the line.

Source: [`assets/cleaker-live/cleaker-live.js`](https://github.com/neurons-me/Cleaker/blob/main/assets/cleaker-live/cleaker-live.js).
