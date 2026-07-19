import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { keccak256 } from "viem";

export const CHAIN_ID = 10143;
export const RPC_URL = "https://testnet-rpc.monad.xyz";
export const CREATE_CALL_ADDRESS = "0x9b35Af71d77eaf8d7e40252370304687390A1A52";

const contractName = "RepRegistry";
const sourceName = "src/RepRegistry.sol";
const artifactLabel = "artifacts/src/RepRegistry.sol/RepRegistry.json";
const artifactUrl = new URL(`../${artifactLabel}`, import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function prepareArtifact(artifact) {
  assert(artifact?.contractName === contractName, `Expected ${contractName} artifact`);
  assert(artifact?.sourceName === sourceName, `Expected ${sourceName} artifact`);
  assert(
    typeof artifact?.bytecode === "string" && /^0x(?:[0-9a-fA-F]{2})+$/.test(artifact.bytecode),
    "Artifact creation bytecode is missing or malformed",
  );

  const bytecode = artifact.bytecode;

  return {
    network: {
      name: "Monad Testnet",
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
    },
    contract: {
      name: contractName,
      sourceName,
      artifact: artifactLabel,
      creationBytecodeBytes: (bytecode.length - 2) / 2,
      creationBytecodeHash: keccak256(bytecode),
    },
    safeProposal: {
      mode: "deployment",
      createCall: CREATE_CALL_ADDRESS,
      operation: "DELEGATECALL",
      valueWei: "0",
      broadcasts: false,
      creationBytecode: bytecode,
    },
  };
}

export async function loadArtifact() {
  return JSON.parse(await readFile(artifactUrl, "utf8"));
}

export async function loadDeployment() {
  return prepareArtifact(await loadArtifact());
}

async function main() {
  const args = process.argv.slice(2);
  assert(args.length <= 1 && (!args[0] || args[0] === "--bytecode"), "Usage: prepare-safe-deployment.mjs [--bytecode]");

  const deployment = await loadDeployment();
  const output = args[0] === "--bytecode"
    ? deployment.safeProposal.creationBytecode
    : JSON.stringify(deployment, null, 2);

  process.stdout.write(`${output}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";

if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
