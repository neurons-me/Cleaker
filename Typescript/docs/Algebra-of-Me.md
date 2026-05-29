# The Algebra of Me

Let us define the universe of the system:

> **𝕌 =** the set of all possible namespaces.
> **A namespace** is a composite structure: **N = (domain, port)**

Each component may be present or absent.

## Base Rule: "More specific ⇒ Subset"

When additional components are introduced (subdomain, port, path), the covered region becomes smaller.

- **cleaker.me** contains **cleaker.me:8161**
- **cleaker.me** contains **jabellae.cleaker.me**
- **jabellae.cleaker.me** contains **jabellae.cleaker.me/board**

Formally: if **A** is less specific than **B**, then **B ⊆ A**.

## A0 — Namespace as Region

A namespace **N** is a region defined by a set of coordinates:

**N = { domain, port?, path?, subdomain?, … }**

There exists a refinement operator (**⊑**) such that: if **B** adds coordinates to **A**, then **B ⊑ A** and **B ⊆ A**.

## A1 — Relation as Function

A relation **R** is a function that maps a viewer namespace to a target namespace:

**R : N_viewer → N_target**

## A2 — Relation Refinement

A relation **R_B** refines **R_A** if for all viewer namespaces, the target of **R_B** is more specific than that of **R_A**.

## A3 — Relation Composition

Given **R_A : N_viewer → N_intermediate** and **R_B : N_intermediate → N_target**, their composition is:

**R_C(N_viewer) = R_B(R_A(N_viewer))**

## A4 — Identity Relation

The identity relation **I** maps any viewer namespace to itself:

**I(N_viewer) = N_viewer**

## A5 — Existence Relation

An existence relation **E** maps any viewer namespace to a base existence namespace:

**E(N_viewer) = N_existence**

## A6 — Semantic-to-Routing Resolver

The **.me** language expresses **semantic paths**; Cleaker resolves them into **routing targets**.

- **Semantic (.me):** `cleaker.me/@username/device/suiGNMacBookAir/PORT/profile`
- **Routing (cleaker):** `username.cleaker.me:suiGNMacBookAir:8161/profile`

Interpretation:
- **.me** defines the meaning (device, PORT, namespace, identity).
- **cleaker** performs the resolution (semantics → routing).
- **monad.ai** is the surface.

This preserves a clean separation: **language (meaning)** → **dictionary (resolver)** → **storage (ledger)**.
