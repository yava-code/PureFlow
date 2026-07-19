import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getAddress } from "viem";
import { CHAIN_ID } from "./prepare-safe-deployment.mjs";

const contractId = "src/RepRegistry.sol:RepRegistry";
const root = fileURLToPath(new URL("..", import.meta.url));
const foundryArtifact = path.join(root, "out", "RepRegistry.sol", "RepRegistry.json");
const hardhatArtifact = path.join(root, "artifacts", "src", "RepRegistry.sol", "RepRegistry.json");

function forgePath() {
  if (process.env.FOUNDRY_FORGE) return process.env.FOUNDRY_FORGE;

  const local = path.join(os.homedir(), ".foundry", "bin", process.platform === "win32" ? "forge.exe" : "forge");
  return existsSync(local) ? local : "forge";
}

function runForge(args) {
  const result = spawnSync(forgePath(), args, { cwd: root, encoding: "utf8" });
  if (result.error) throw new Error(`Unable to run Foundry forge: ${result.error.message}`);
  if (result.status !== 0) throw new Error(result.stderr.trim() || `forge exited with ${result.status}`);
  return result.stdout.trim();
}

export function assertCanonicalBytecode(hardhat, foundry) {
  if (hardhat.bytecode?.toLowerCase() !== foundry.bytecode?.object?.toLowerCase()) {
    throw new Error("Foundry creation bytecode does not match the Hardhat production artifact");
  }
  if (hardhat.deployedBytecode?.toLowerCase() !== foundry.deployedBytecode?.object?.toLowerCase()) {
    throw new Error("Foundry runtime bytecode does not match the Hardhat production artifact");
  }
}

export function makeVerificationPayload(address, standardJsonInput, artifact) {
  const compiler = artifact.metadata?.compiler?.version;
  if (!/^0\.8\.28\+commit\.[0-9a-f]{8}$/.test(compiler ?? "")) {
    throw new Error("Unexpected Foundry compiler metadata");
  }

  return {
    chainId: CHAIN_ID,
    contractAddress: getAddress(address),
    contractName: contractId,
    compilerVersion: `v${compiler}`,
    standardJsonInput,
    foundryMetadata: artifact.metadata,
  };
}

export async function prepareVerification(address) {
  runForge(["build", "--force"]);

  const [hardhat, foundry] = await Promise.all([
    readFile(hardhatArtifact, "utf8").then(JSON.parse),
    readFile(foundryArtifact, "utf8").then(JSON.parse),
  ]);
  assertCanonicalBytecode(hardhat, foundry);

  const standardInput = JSON.parse(runForge([
    "verify-contract",
    getAddress(address),
    contractId,
    "--chain",
    String(CHAIN_ID),
    "--show-standard-json-input",
  ]));

  return makeVerificationPayload(address, standardInput, foundry);
}

async function main() {
  const [address, ...extra] = process.argv.slice(2);
  if (!address || extra.length) throw new Error("Usage: prepare-source-verification.mjs <contract-address>");
  process.stdout.write(`${JSON.stringify(await prepareVerification(address), null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";

if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
