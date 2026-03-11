# NRP Routing Spec

## Purpose

This document fixes the boundary between `.me`, `nrp`, and the `cleaker` server.

- `.me` is the local semantic kernel.
- `nrp` is the semantic addressing layer.
- `cleaker` server is an HTTP transport and persistence surface for remote namespaces.

The server must expose `cleaker.me` and related HTTP routes. It must not redefine `nrp://local` as a network resource.

## Layer Contract

### `.me`

`.me` owns:

- local state
- local execution
- local memory replay
- local path semantics

Examples:

- `profile.name`
- `friends.ana.bio`
- `friends[age > 18].name`

### `nrp`

`nrp` owns:

- semantic target identity
- local vs remote addressing
- transport-agnostic destination syntax

Examples:

- `nrp://local/profile.name`
- `nrp://self/profile.name`
- `nrp://ana.cleaker/read/profile`

### `cleaker` server

The server owns:

- claim and open flows
- remote namespace persistence
- block append and replay
- HTTP route exposure for remote surfaces
- mapping HTTP host/path requests into canonical namespace strings

Examples:

- `POST /claims`
- `POST /claims/open`
- `POST /`
- `GET /`
- `GET /blocks`

## Non-Goals

The server does not own:

- in-process `.me` execution
- `nrp://local`
- `nrp://self`

Those targets are resolved inside the local runtime or binder.

## Canonical Target Classes

### Local sovereign target

Resolved without network.

Examples:

- `nrp://local/profile.name`
- `nrp://self/profile.name`

Expected resolver:

- `.me` kernel
- `cleaker(me)` binder when bound to an in-process kernel

### Remote namespace target

Resolved through a transport.

Examples:

- `nrp://ana.cleaker/read/profile`
- `ana.cleaker:read/profile`
- `https://cleaker.me/@ana/profile`
- `https://ana.cleaker.me/profile`

Expected resolver:

- `cleaker` HTTP server

## Canonical Namespace Model

The server should continue using canonical namespace strings as the internal storage key.

Current examples already implemented:

- `cleaker.me`
- `cleaker.me/users/ana`
- `cleaker.me/relations/ana+bella`
- `localhost`
- `localhost/users/ana`

Rule:

- host and path are transport syntax
- canonical namespace is the storage identity
- NRP target is the semantic identity

These three must map deterministically.

## HTTP to Namespace to NRP Mapping

### Root host

HTTP:

- `GET https://cleaker.me/`

Canonical namespace:

- `cleaker.me`

Canonical NRP:

- `nrp://cleaker.me/read`

### User subdomain

HTTP:

- `GET https://ana.cleaker.me/`

Canonical namespace:

- `cleaker.me/users/ana`

Canonical NRP:

- `nrp://cleaker.me/users/ana/read`

### User path selector

HTTP:

- `GET https://cleaker.me/@ana`

Canonical namespace:

- `cleaker.me/users/ana`

Canonical NRP:

- `nrp://cleaker.me/users/ana/read`

### Symmetric relation

HTTP:

- `GET https://cleaker.me/@ana+bella`

Canonical namespace:

- `cleaker.me/relations/ana+bella`

Canonical NRP:

- `nrp://cleaker.me/relations/ana+bella/read`

### Nested directional path

HTTP:

- `GET https://cleaker.me/@ana/@bella`

Canonical namespace:

- `cleaker.me/users/ana/users/bella`

Canonical NRP:

- `nrp://cleaker.me/users/ana/users/bella/read`

### Local dev host

HTTP:

- `GET http://localhost:8161/`

Canonical namespace:

- `localhost`

Canonical NRP:

- `nrp://localhost/read`

### Local dev user subdomain

HTTP:

- `GET http://ana.localhost:8161/`

Canonical namespace:

- `localhost/users/ana`

Canonical NRP:

- `nrp://localhost/users/ana/read`

## Write Mapping

For writes, the target resource remains the current resolved namespace.

Examples:

- `POST https://cleaker.me/` with `Host: ana.cleaker.me`
- `POST https://cleaker.me/` with `x-forwarded-host: ana.cleaker.me`

Canonical namespace:

- `cleaker.me/users/ana`

Canonical NRP intent:

- `nrp://cleaker.me/users/ana/write`

Claim/open remain namespace operations, not path operations:

- `POST /claims`
- `POST /claims/open`

Body:

- `namespace`
- `secret`

## Binder Responsibilities

`cleaker(me)` should decide resolution by target class:

- local `.me` expression -> resolve in-process
- `nrp://local/...` -> resolve in-process
- `nrp://self/...` -> resolve in currently bound kernel
- `ana.cleaker:read/profile` or equivalent remote target -> resolve through configured transport

This means the binder should treat `nrp` as the router and the server as one transport backend.

## Parsing Guidance

Short-term:

- keep current `.cleaker:read/...` support
- keep current host/path HTTP routing
- do not force `nrp://` into the server API yet

Medium-term:

- add a canonical parser that normalizes:
  - `ana.cleaker:read/profile`
  - `nrp://cleaker.me/users/ana/read/profile`
  - `https://ana.cleaker.me/profile`

All three should converge to one internal target record.

## Server Rules

1. The server may expose HTTP routes for remote namespaces.
2. The server must never claim ownership of `nrp://local`.
3. `resolveNamespace(req)` should stay transport-facing and return canonical namespace strings.
4. A separate normalization layer should map canonical namespace strings to canonical NRP targets.
5. Claim/open logic should remain namespace-based, not tied to a particular URL shape.

## Immediate Implementation Priority

The next practical step is not to expose a literal `nrp://` HTTP endpoint.

The next step is to add one normalization utility on the server side:

- input: host + path + method
- output:
  - canonical namespace
  - canonical NRP target
  - operation kind: `read`, `write`, `claim`, `open`

That utility becomes the contract between routing and the engine.
