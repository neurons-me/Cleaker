# cleaker tests

`cleaker` is now a small binder package. Its tests focus on that smaller contract:

- `quickstart.test.ts`: string target parsing and pointer shape
- `bind.test.ts`: kernel binding and direct pointer behavior
- `integration.real.test.ts`: namespace derivation, host discovery, and primary HTTP binding behavior
- `sovereign-loop.test.ts`: replay hydration into a fresh `.me` kernel
- `remote-replay.real.test.ts`: real daemon claim/open/write/replay loop
- `Builds/*`: ESM/CJS/type surface checks
- `contracts/nrp.contract.test.mjs`: wire-level contract expectations for `me://`

## Runtime expectation

The canonical transport path is:

```txt
POST / { operation: "claim" | "open" | "write", ... }
```

Legacy `/claims/open` can still be tolerated by the runtime for backwards compatibility, but the tests in this package should prefer the primary binding.

## Why these tests exist

The package is no longer a registry, session, or audit framework. The important guarantees now are:

1. a `.me` kernel can be projected into a namespace
2. `cleaker` can auto-open or auto-claim and then hydrate
3. remote pointers still parse and resolve correctly
4. the public package surface stays small and stable
