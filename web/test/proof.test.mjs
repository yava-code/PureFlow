import assert from "node:assert/strict";
import test from "node:test";
import { readAttestationHash } from "../src/proof.ts";

const valid = {
  version: 1,
  chainId: 10_143,
  commitment: `0x${"11".repeat(32)}`,
  focusedSeconds: 1_518,
  testRuns: 4,
  debugLoops: 2,
  ownership: 3,
};

test("accepts the IDE prepared-proof payload", () => {
  const result = readAttestationHash(`#attest=${encode(valid)}`);
  assert.equal(result.kind, "prepared");
  assert.deepEqual(result.payload, valid);
});

test("returns none when no handoff is present", () => {
  assert.deepEqual(readAttestationHash("#product"), { kind: "none" });
});

test("rejects unsupported versions and networks", () => {
  assert.match(rejection({ ...valid, version: 2 }), /version must be 1/);
  assert.match(rejection({ ...valid, chainId: 1 }), /Monad Testnet/);
});

test("rejects values the registry contract would reject", () => {
  assert.match(rejection({ ...valid, commitment: `0x${"00".repeat(32)}` }), /cannot be zero/);
  assert.match(rejection({ ...valid, focusedSeconds: 0 }), /focusedSeconds/);
  assert.match(rejection({ ...valid, testRuns: 65_536 }), /testRuns/);
  assert.match(rejection({ ...valid, ownership: 4 }), /ownership/);
});

test("drops fields outside the public handoff schema", () => {
  const result = readAttestationHash(`#attest=${encode({ ...valid, goal: "private", code: "secret", privateKey: "nope" })}`);
  assert.equal(result.kind, "prepared");
  assert.deepEqual(result.payload, valid);
});

test("rejects oversized handoffs before decoding", () => {
  const result = readAttestationHash(`#attest=${"a".repeat(2_049)}`);
  assert.equal(result.kind, "invalid");
  assert.match(result.error, /too large/);
});

function rejection(value) {
  const result = readAttestationHash(`#attest=${encode(value)}`);
  assert.equal(result.kind, "invalid");
  return result.error;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
