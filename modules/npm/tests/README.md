# cleaker tests

Current layers:
- `axioms.test.ts`: semantic invariants of grammar and pointer shape
- `contracts/nrp.contract.test.mjs`: built-contract expectations
- `Builds/*`: ESM/CJS/type surface checks

Planned next:
- resolver tests
- transport handshake tests
- `.me` integration tests
- sync/replay tests

## Claim and Verify (Server-side reference)

Even though this package focuses on parser/pointer contracts, claim verification currently runs in the server layer and is the canonical source for namespace identity checks.

Reference test:
- core/cleaker/server/tests/claim_test_verification.ts

### What is validated

1. Verified flow
- Claim a fresh namespace with a secret
- Open the same namespace with the same secret
- Assert that recovered noise equals originally issued noise

2. Failed flow
- Claim a fresh namespace with a secret
- Open with a different secret
- Assert CLAIM_VERIFICATION_FAILED

### Minimal test logic (English summary)

```txt
claim(namespace, secret) -> ok
open(namespace, secret) -> ok and noise matches

claim(namespace, secret) -> ok
open(namespace, wrongSecret) -> fail with CLAIM_VERIFICATION_FAILED
```

### Run and expected output

```bash
cd core/cleaker/server
npm run build
npm test
```

Expected output:

```txt
PASS claim_test_verification.verified
PASS claim_test_verification.failed
All claim verification tests passed.
```

### Why this matters for replay hydration

Claim verification is the gate before namespace open. After verification succeeds, open can safely return:
- noise for deterministic local derivations
- memories ordered by timestamp for semantic replay

This is the mechanism that allows a kernel to recover the same mental state after restart.
