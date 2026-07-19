import { createPublicClient, http, isAddress, type Address, type Hex } from "viem";
import { monadTestnet } from "viem/chains";

const configuredAddress = import.meta.env.VITE_REP_REGISTRY_ADDRESS as string | undefined;

export const registryAddress = configuredAddress && isAddress(configuredAddress)
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
  transport: http("https://testnet-rpc.monad.xyz"),
});

export interface Verification {
  commitment: Hex;
  attestor: Address;
  registered: boolean;
  registry: Address;
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

