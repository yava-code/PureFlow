import { createPublicClient, formatGwei, http, isAddress, type Address, type Hex } from "viem";
import { monadTestnet } from "viem/chains";

export const monadChainId = 10_143;
export const monadRpcUrl = "https://testnet-rpc.monad.xyz";

/** Monad Testnet RepRegistry (Safe-deployed). Prefer env; fallback is the live public address. */
const LIVE_REP_REGISTRY = "0xB51B276e6Ee9Cad8181C368bbF6d6efB82c154c8";
const configuredAddress = (import.meta.env.VITE_REP_REGISTRY_ADDRESS as string | undefined)?.trim()
  || LIVE_REP_REGISTRY;

export const registryAddress = isAddress(configuredAddress)
  ? configuredAddress as Address
  : undefined;

export const explorerUrl = registryAddress
  ? `https://testnet.monadscan.com/address/${registryAddress}`
  : "https://testnet.monadscan.com";

const abi = [
  {
    type: "function",
    name: "attestorOf",
    stateMutability: "view",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [{ name: "developer", type: "address" }],
  },
] as const;

const client = createPublicClient({
  chain: monadTestnet,
  transport: http(monadRpcUrl, { timeout: 8_000 }),
});

export interface NetworkStatus {
  chainId: number;
  latestBlock: bigint;
  safeBlock: bigint;
  finalizedBlock: bigint;
  gasPriceGwei: string;
  latencyMs: number;
  checkedAt: number;
}

export interface Verification {
  commitment: Hex;
  attestor: Address;
  registered: boolean;
  registry: Address;
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  const started = performance.now();
  const [chainId, latest, safe, finalized, gasPrice] = await Promise.all([
    client.getChainId(),
    client.getBlock({ blockTag: "latest" }),
    client.getBlock({ blockTag: "safe" }),
    client.getBlock({ blockTag: "finalized" }),
    client.getGasPrice(),
  ]);
  if (chainId !== monadChainId) {
    throw new Error(`Expected Monad Testnet chain ${monadChainId}, RPC returned ${chainId}.`);
  }
  if (latest.number === null || safe.number === null || finalized.number === null) {
    throw new Error("Monad RPC returned a block without a number.");
  }
  return {
    chainId,
    latestBlock: latest.number,
    safeBlock: safe.number,
    finalizedBlock: finalized.number,
    gasPriceGwei: trimDecimal(formatGwei(gasPrice), 6),
    latencyMs: Math.round(performance.now() - started),
    checkedAt: Date.now(),
  };
}

export async function verifyCommitment(value: string): Promise<Verification> {
  if (!registryAddress) throw new Error("Registry address is not configured for this deployment.");
  if (!/^0x[\da-fA-F]{64}$/.test(value)) throw new Error("Enter a 32-byte commitment beginning with 0x.");
  const commitment = value as Hex;
  const attestor = await client.readContract({
    address: registryAddress,
    abi,
    functionName: "attestorOf",
    args: [commitment],
  });
  return {
    commitment,
    attestor,
    registered: attestor !== "0x0000000000000000000000000000000000000000",
    registry: registryAddress,
  };
}

function trimDecimal(value: string, precision: number) {
  const [whole, decimal = ""] = value.split(".");
  const fraction = decimal.slice(0, precision).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
