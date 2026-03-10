import assert from "assert";
import crypto from "crypto";
import { claimNamespace, openNamespace } from "../src/claim/records";

function uniqueNamespace() {
  return `claim-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.cleaker`;
}

function pass(label: string) {
  console.log(`PASS ${label}`);
}

function fail(label: string, error: unknown): never {
  console.error(`FAIL ${label}`);
  throw error instanceof Error ? error : new Error(String(error));
}

function testVerified() {
  const namespace = uniqueNamespace();
  const secret = "luna";

  const claim = claimNamespace({ namespace, secret });
  assert.equal(claim.ok, true, "claim should succeed for a fresh namespace");
  if (!claim.ok) {
    throw new Error(`claim failed with ${claim.error}`);
  }

  const opened = openNamespace({ namespace, secret });
  assert.equal(opened.ok, true, "open should succeed with the correct secret");
  if (!opened.ok) {
    throw new Error(`open failed with ${opened.error}`);
  }

  assert.equal(opened.record.namespace, namespace);
  assert.equal(opened.record.identityHash, claim.record.identityHash);
  assert.equal(opened.noise, claim.noise, "opening must recover the original noise");
}

function testFailed() {
  const namespace = uniqueNamespace();
  const secret = "luna";

  const claim = claimNamespace({ namespace, secret });
  assert.equal(claim.ok, true, "claim should succeed for a fresh namespace");
  if (!claim.ok) {
    throw new Error(`claim failed with ${claim.error}`);
  }

  const opened = openNamespace({ namespace, secret: "sol" });
  assert.equal(opened.ok, false, "open should fail with the wrong secret");
  if (opened.ok) {
    throw new Error("open unexpectedly succeeded");
  }

  assert.equal(opened.error, "CLAIM_VERIFICATION_FAILED");
}

try {
  testVerified();
  pass("claim_test_verification.verified");

  testFailed();
  pass("claim_test_verification.failed");

  console.log("All claim verification tests passed.");
} catch (error) {
  fail("claim_test_verification", error);
}
