import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createPublicClient,
  decodeEventLog,
  defineChain,
  getAddress,
  http,
  keccak256,
  parseAbiItem,
} from "viem";
import {
  CHAIN_ID,
  CREATE_CALL_ADDRESS,
  loadArtifact,
  RPC_URL,
} from "./prepare-safe-deployment.mjs";

export const CONTRACT_CREATION_EVENT = parseAbiItem("event ContractCreation(address indexed newContract)");

const explorer = "https://testnet.monadscan.com";
const chain = defineChain({
  id: CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Monadscan", url: explorer } },
  testnet: true,
});

function sameAddress(left, right) {
  return left?.toLowerCase() === right?.toLowerCase();
}

export function findCreatedAddress(logs, safeAddress) {
  const matches = [];

  for (const log of logs) {
    const fromCreateCall = sameAddress(log.address, CREATE_CALL_ADDRESS);
    const fromSafeContext = safeAddress && sameAddress(log.address, safeAddress);
    if (!fromCreateCall && !fromSafeContext) continue;

    try {
      const decoded = decodeEventLog({
        abi: [CONTRACT_CREATION_EVENT],
        data: log.data,
        topics: log.topics,
        strict: true,
      });

      if (decoded.eventName === "ContractCreation") {
        matches.push(getAddress(decoded.args.newContract));
      }
    } catch {
      // The Safe and CreateCall can emit other events in the same receipt.
    }
  }

  const unique = [...new Set(matches)];
  if (unique.length === 0) throw new Error("Receipt has no CreateCall ContractCreation event");
  if (unique.length > 1) throw new Error("Receipt has multiple CreateCall contract addresses");
  return unique[0];
}

export function compareRuntimeBytecode(actual, expected) {
  if (!/^0x(?:[0-9a-fA-F]{2})+$/.test(expected)) throw new Error("Artifact runtime bytecode is missing or malformed");
  if (!/^0x(?:[0-9a-fA-F]{2})+$/.test(actual)) throw new Error("Deployed runtime bytecode is empty or malformed");

  const expectedHash = keccak256(expected);
  const actualHash = keccak256(actual);
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`Deployed bytecode does not match RepRegistry artifact (${actualHash} != ${expectedHash})`);
  }

  return { expectedHash, actualHash };
}

export async function verifyDeployment(txHash, client = createPublicClient({ chain, transport: http(RPC_URL) })) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("Expected a 32-byte transaction hash");

  const chainId = await client.getChainId();
  if (chainId !== CHAIN_ID) throw new Error(`RPC returned chain ${chainId}; expected ${CHAIN_ID}`);

  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error(`Deployment transaction status is ${receipt.status}`);

  const address = findCreatedAddress(receipt.logs, receipt.to);
  const bytecode = await client.getBytecode({ address });
  if (!bytecode || bytecode === "0x") throw new Error(`No deployed bytecode at ${address}`);

  const artifact = await loadArtifact();
  if (artifact.contractName !== "RepRegistry" || artifact.sourceName !== "src/RepRegistry.sol") {
    throw new Error("Expected RepRegistry runtime artifact");
  }
  const hashes = compareRuntimeBytecode(bytecode, artifact.deployedBytecode);

  return {
    network: "Monad Testnet",
    chainId,
    transactionHash: txHash,
    blockNumber: receipt.blockNumber.toString(),
    contractAddress: address,
    deployedBytecodeBytes: (bytecode.length - 2) / 2,
    expectedRuntimeBytecodeHash: hashes.expectedHash,
    actualRuntimeBytecodeHash: hashes.actualHash,
    transactionExplorerUrl: `${explorer}/tx/${txHash}`,
    contractExplorerUrl: `${explorer}/address/${address}`,
    sourceVerification: "not checked",
  };
}

async function main() {
  const [txHash, ...extra] = process.argv.slice(2);
  if (!txHash || extra.length) throw new Error("Usage: verify-safe-deployment.mjs <transaction-hash>");
  process.stdout.write(`${JSON.stringify(await verifyDeployment(txHash), null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";

if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
