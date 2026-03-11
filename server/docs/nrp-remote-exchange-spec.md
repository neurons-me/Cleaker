# NRP Remote Exchange Spec

## Purpose

This document defines the wire contract for remote NRP resolution over HTTP.

Goal:

- keep the exchange compatible with the current `cleaker` pointer runtime
- avoid coupling the kernel to HTTP route quirks
- leave room for future transport formats without changing `.me`

## Decision

Use plain JSON as the canonical exchange format for now.

Do not require JSON-LD yet.

Reason:

- current client code already consumes plain JSON
- the system still needs routing and normalization to stabilize
- JSON-LD can be added later as an alternate representation, not as the first contract

## Exchange Layers

### Semantic request

The client conceptually asks for:

- a canonical NRP target
- an operation kind
- optional authorization context

Example semantic target:

- `nrp://cleaker.me/users/ana/read/profile.name`

### Transport request

The HTTP transport maps that target into:

- method
- host
- path
- headers
- query

Example:

- `GET /profile/name`
- `Host: ana.cleaker.me`

## Canonical Operations

### `read`

Read a resolved semantic value from a remote namespace.

### `write`

Append a thought or memory event into a remote namespace.

### `claim`

Forge or reserve namespace identity.

### `open`

Verify the namespace trinity and recover replay state.

## Response Envelope

All remote HTTP responses should use a common envelope.

```json
{
  "ok": true,
  "operation": "read",
  "transport": {
    "protocol": "https",
    "method": "GET"
  },
  "target": {
    "nrp": "nrp://cleaker.me/users/ana/read/profile.name",
    "namespace": "cleaker.me/users/ana",
    "path": "profile.name"
  },
  "result": {
    "value": "Ana"
  },
  "meta": {
    "resolvedAt": 1773200000000
  }
}
```

Rules:

- `ok` is always present
- `operation` is always present
- `target.namespace` is always canonical
- `target.nrp` is the semantic identity of the resolved request
- operation-specific payload goes inside `result`
- operational metadata goes inside `meta`

## Read Contract

### Request

Example:

```http
GET /profile/name HTTP/1.1
Host: ana.cleaker.me
Accept: application/json
```

### Successful response

```json
{
  "ok": true,
  "operation": "read",
  "target": {
    "nrp": "nrp://cleaker.me/users/ana/read/profile.name",
    "namespace": "cleaker.me/users/ana",
    "path": "profile.name"
  },
  "result": {
    "value": "Ana"
  },
  "meta": {
    "resolvedAt": 1773200000000,
    "namespaceRecordVerified": false
  }
}
```

### Not found

```json
{
  "ok": false,
  "operation": "read",
  "target": {
    "nrp": "nrp://cleaker.me/users/ana/read/profile.unknown",
    "namespace": "cleaker.me/users/ana",
    "path": "profile.unknown"
  },
  "error": {
    "code": "PATH_NOT_FOUND",
    "message": "No value was resolved for the requested path."
  },
  "meta": {
    "resolvedAt": 1773200000000
  }
}
```

## Write Contract

### Request

```http
POST / HTTP/1.1
Host: ana.cleaker.me
Content-Type: application/json
```

```json
{
  "identityHash": "claim-hash",
  "expression": "profile.name",
  "value": "Ana",
  "payload": {
    "path": "profile.name",
    "value": "Ana"
  }
}
```

### Successful response

```json
{
  "ok": true,
  "operation": "write",
  "target": {
    "nrp": "nrp://cleaker.me/users/ana/write/profile.name",
    "namespace": "cleaker.me/users/ana",
    "path": "profile.name"
  },
  "result": {
    "blockId": "uuid",
    "timestamp": 1773200000000
  }
}
```

## Claim Contract

### Request

```json
{
  "namespace": "ana.cleaker",
  "secret": "luna"
}
```

### Successful response

```json
{
  "ok": true,
  "operation": "claim",
  "target": {
    "nrp": "nrp://cleaker.me/users/ana/claim",
    "namespace": "ana.cleaker"
  },
  "result": {
    "identityHash": "derived-hash"
  },
  "meta": {
    "createdAt": 1773200000000
  }
}
```

## Open Contract

### Successful response

```json
{
  "ok": true,
  "operation": "open",
  "target": {
    "nrp": "nrp://cleaker.me/users/ana/open",
    "namespace": "ana.cleaker"
  },
  "result": {
    "identityHash": "derived-hash",
    "noise": "seeded-noise",
    "memories": [],
    "openedAt": 1773200000000
  },
  "meta": {
    "namespaceRecordVerified": true
  }
}
```

## Error Contract

All failures should use this shape:

```json
{
  "ok": false,
  "operation": "read",
  "target": {
    "nrp": "nrp://cleaker.me/users/ana/read/profile.name",
    "namespace": "cleaker.me/users/ana",
    "path": "profile.name"
  },
  "error": {
    "code": "PATH_NOT_FOUND",
    "message": "No value was resolved for the requested path."
  },
  "meta": {
    "resolvedAt": 1773200000000
  }
}
```

Rules:

- `error.code` is stable and machine-readable
- `error.message` is human-readable
- HTTP status and JSON error code must agree

Recommended mappings:

- `400` -> `BAD_REQUEST`
- `401` -> `UNAUTHORIZED`
- `403` -> `NAMESPACE_WRITE_FORBIDDEN`
- `404` -> `PATH_NOT_FOUND` or `CLAIM_NOT_FOUND`
- `409` -> `NAMESPACE_TAKEN`
- `422` -> `CLAIM_VERIFICATION_FAILED`
- `500` -> `INTERNAL_ERROR`

## Compatibility Rule

During migration, the server may continue returning the current minimal read shape:

```json
{
  "ok": true,
  "namespace": "cleaker.me/users/ana",
  "path": "profile.name",
  "value": "Ana"
}
```

Client normalization should accept both:

- legacy minimal shape
- full response envelope

## Client Normalization

The `remotePointer` client should normalize read responses as follows:

1. If `result.value` exists, use that.
2. Else if top-level `value` exists, use that.
3. Else return the full payload as raw data.

This preserves compatibility with the current server while allowing a richer contract.

## Future Extension

After the envelope stabilizes, add optional:

- `@context`
- signed namespace records
- response signatures
- content negotiation for `application/ld+json`

But those should be additive, not required for the first remote contract.
