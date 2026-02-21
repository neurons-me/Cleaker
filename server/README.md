# Cleaker Server — Runtime & Engine

Cleaker is a **namespace‑centric runtime** that exposes a universal ledger, semantic path resolution, and identity primitives over HTTP.

This repository currently hosts the **Cleaker server**: the authoritative engine where namespaces, blocks, identities, and relations live.

This README intentionally documents **where the project is now** and **where it is going**, so the architecture can evolve without confusion.

---

## Where We Are Now (Current State)

At present, this project is a **single Express server entrypoint** (`server.ts`) that performs several responsibilities:

### 1. Entry Point / Runtime
- Starts an Express server (default port `8161`)
- Enables CORS and JSON parsing
- Serves a SPA shell when `Accept: text/html` is detected
- Serves static assets (GUI) under `/gui`

### 2. Namespace Resolution (Core Concept)
Every incoming request is resolved into a **namespace**, derived from:
- `Host` header (domain / subdomain)
- Optional path selectors (`/@username`, `@a+b`, etc.)

This means:
- Each host or subdomain maps to an independent logical namespace
- Namespaces are **independent of users or sessions**
- Reality exists before identity

### 3. Universal Ledger
Cleaker stores facts as immutable blocks in SQLite:

- `POST /` → append a block to the ledger
- `GET /` / `GET /blocks` → read blocks (filterable by namespace, identityHash, limit)
- `GET /@*` → same as above, but with explicit selector in the path

Each block is stored as JSON and scoped to a namespace.

### 4. Semantic Path Resolution
A catch‑all route (`GET /*`) resolves semantic paths such as:

```
/profile/displayName
/wallet/eth/net
```

This works by:
1. Reading blocks in the resolved namespace
2. Folding them into a state tree (newest value wins)
3. Returning the value at the requested path

This is what turns Cleaker from “just a ledger” into a **language**.

### 5. Identity & Biometrics
The server also exposes identity primitives:
- `POST /users` — claim a username
- `GET /users/:username` — query user data
- `POST /faces/enroll` — store face embeddings
- `POST /faces/match` — cosine similarity matching

### 6. Data Layer
- SQLite via `better-sqlite3`
- Single shared connection
- WAL enabled
- DB path currently derived from `process.cwd()`
- Tables:
  - `blocks`
  - `users`
  - `faces`

---

## What This Is Not (Yet)

- This is **not** yet a cleanly separated engine
- This is **not** yet a documented Node library
- This is **not** yet an SDK or fluent client API

All logic currently lives close to the runtime for speed of iteration.

---

## Where We Are Going (Intended Direction)

The goal is to evolve Cleaker into **three clear layers**:

### 1. Engine (Pure Logic)
A reusable, documented engine that contains:
- Namespace algebra
- Ledger rules
- Semantic resolution
- Deterministic folding

This will live in `src/engine/*` and be exportable as a library.

### 2. Server (Transport)
The Express server becomes:
- A thin HTTP transport
- A host for persistence (SQLite)
- A gateway that maps HTTP → engine calls

Minimal logic. Mostly wiring.

### 3. SDK (Language / Client)
A future SDK will expose Cleaker as a **navigable language**:

```js
cleaker.me(username, password).wallet.eth.net()
```

This SDK will:
- Talk to the server
- Reflect namespaces dynamically
- Allow inspection (`.tree()`, `.ls()`, `.blocks()`)

---

## Guiding Principles

- **Reality exists without the observer**
- Namespaces are regions, not users
- Identity is optional and layered
- Semantics emerge from blocks, not schemas
- Transport (HTTP) is replaceable; algebra is not

---

## Next Concrete Steps

1. Extract the engine into explicit modules:
   - `engine/namespace`
   - `engine/ledger`
   - `engine/semantic`
2. Freeze the block contract
3. Add tests at the engine layer
4. Generate API documentation (TypeDoc)
5. Build the SDK on top of the stable engine

---

## Commands

### Start Development Server
```bash
npm run dev
```

---

## Domains & Namespaces

- `cleaker.me` → global namespace
- `username.cleaker.me` → user namespace
- `localhost:8161` → local namespace
- `username.localhost:8161` → local user namespace

A namespace is defined as:
```
(domain, port?, path?, subdomain?, …)
```

More specific namespaces are subsets of less specific ones.

---

## License
MIT

https://neurons.me