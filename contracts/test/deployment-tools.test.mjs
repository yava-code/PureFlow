import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { encodeEventTopics, getAddress } from "viem";
import {
  CHAIN_ID,
  CREATE_CALL_ADDRESS,
  prepareArtifact,
} from "../scripts/prepare-safe-deployment.mjs";
import {
  compareRuntimeBytecode,
  CONTRACT_CREATION_EVENT,
  findCreatedAddress,
} from "../scripts/verify-safe-deployment.mjs";
import {
  assertCanonicalBytecode,
  makeVerificationPayload,
} from "../scripts/prepare-source-verification.mjs";

const bytecode = "0x6000600055";
const artifact = {
  contractName: "RepRegistry",
  sourceName: "src/RepRegistry.sol",
  bytecode,
};

test("prepares an auditable Safe deployment payload", () => {
  const result = prepareArtifact(artifact);

  assert.equal(result.network.chainId, CHAIN_ID);
  assert.equal(result.contract.creationBytecodeBytes, 5);
  assert.match(result.contract.creationBytecodeHash, /^0x[0-9a-f]{64}$/);
  assert.equal(result.safeProposal.createCall, CREATE_CALL_ADDRESS);
  assert.equal(result.safeProposal.operation, "DELEGATECALL");
  assert.equal(result.safeProposal.broadcasts, false);
  assert.equal(result.safeProposal.creationBytecode, bytecode);
});

test("rejects an unexpected or malformed artifact", () => {
  assert.throws(() => prepareArtifact({ ...artifact, contractName: "Other" }), /RepRegistry artifact/);
  assert.throws(() => prepareArtifact({ ...artifact, bytecode: "0x60zz" }), /malformed/);
});

test("--bytecode writes creation bytecode and nothing else", () => {
  const script = fileURLToPath(new URL("../scripts/prepare-safe-deployment.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [script, "--bytecode"], { encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^0x[0-9a-fA-F]+\r?\n$/);
});

test("decodes the indexed CreateCall contract address from a Safe-context log", () => {
  const safe = "0x1111111111111111111111111111111111111111";
  const created = "0x2222222222222222222222222222222222222222";
  const topics = encodeEventTopics({
    abi: [CONTRACT_CREATION_EVENT],
    eventName: "ContractCreation",
    args: { newContract: created },
  });

  const result = findCreatedAddress([{ address: safe, data: "0x", topics }], safe);
  assert.equal(result, getAddress(created));
});

test("ignores matching topics from unrelated contracts", () => {
  const safe = "0x1111111111111111111111111111111111111111";
  const topics = encodeEventTopics({
    abi: [CONTRACT_CREATION_EVENT],
    eventName: "ContractCreation",
    args: { newContract: "0x2222222222222222222222222222222222222222" },
  });

  assert.throws(
    () => findCreatedAddress([{ address: "0x3333333333333333333333333333333333333333", data: "0x", topics }], safe),
    /no CreateCall ContractCreation event/,
  );
});

test("requires deployed runtime bytecode to match RepRegistry", () => {
  const match = compareRuntimeBytecode("0x60006000", "0x60006000");

  assert.equal(match.actualHash, match.expectedHash);
  assert.throws(
    () => compareRuntimeBytecode("0x60006001", "0x60006000"),
    /does not match RepRegistry artifact/,
  );
});

test("requires Foundry verification bytes to match the deployment artifact", () => {
  const hardhat = { bytecode: "0x6000", deployedBytecode: "0x6001" };
  const foundry = {
    bytecode: { object: "0x6000" },
    deployedBytecode: { object: "0x6001" },
  };

  assert.doesNotThrow(() => assertCanonicalBytecode(hardhat, foundry));
  assert.throws(
    () => assertCanonicalBytecode(hardhat, { ...foundry, deployedBytecode: { object: "0x6002" } }),
    /runtime bytecode does not match/,
  );
});

test("builds the all-explorer verification request", () => {
  const metadata = { compiler: { version: "0.8.28+commit.7893614a" } };
  const payload = makeVerificationPayload(
    "0x1111111111111111111111111111111111111111",
    { language: "Solidity", sources: {} },
    { metadata },
  );

  assert.equal(payload.chainId, CHAIN_ID);
  assert.equal(payload.contractName, "src/RepRegistry.sol:RepRegistry");
  assert.equal(payload.compilerVersion, "v0.8.28+commit.7893614a");
  assert.equal(payload.foundryMetadata, metadata);
});
