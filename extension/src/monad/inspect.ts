import { MonadRpcClient, toDecimalQuantity } from "./rpc";
import {
  MONAD_TESTNET_EXPLORER_URL,
  MonadRpcError,
  type Address,
  type AddressInspection,
  type Hex,
  type MonadBlockTag,
  type TransactionFinality,
  type TransactionHash,
  type TransactionInspection,
} from "./types";

interface RawTransaction {
  from?: unknown;
  to?: unknown;
  blockNumber?: unknown;
}

interface RawReceipt {
  status?: unknown;
  from?: unknown;
  to?: unknown;
  contractAddress?: unknown;
  blockNumber?: unknown;
  gasUsed?: unknown;
  effectiveGasPrice?: unknown;
  logs?: unknown;
}

export type InspectTarget =
  | { kind: "address"; value: Address }
  | { kind: "transaction"; value: TransactionHash };

export function parseInspectTarget(value: string): InspectTarget {
  const normalized = value.trim().toLowerCase();
  if (/^0x[\da-f]{40}$/.test(normalized)) {
    return { kind: "address", value: normalized as Address };
  }
  if (/^0x[\da-f]{64}$/.test(normalized)) {
    return { kind: "transaction", value: normalized as TransactionHash };
  }
  throw new MonadRpcError(
    "invalid-input",
    "Select a 20-byte address or a 32-byte transaction hash beginning with 0x.",
  );
}

export async function inspectAddress(
  value: string,
  client = new MonadRpcClient(),
  blockTag: MonadBlockTag = "safe",
): Promise<AddressInspection> {
  const target = parseInspectTarget(value);
  if (target.kind !== "address") {
    throw new MonadRpcError("invalid-input", "Address inspection requires a 20-byte address.");
  }
  const chainId = await client.assertTestnet();
  const [balance, nonce, code] = await Promise.all([
    client.request<unknown>("eth_getBalance", [target.value, blockTag]),
    client.request<unknown>("eth_getTransactionCount", [target.value, blockTag]),
    client.request<unknown>("eth_getCode", [target.value, blockTag]),
  ]);
  const codeBytes = byteLength(code, "eth_getCode");
  return {
    chainId,
    address: target.value,
    blockTag,
    kind: codeBytes === 0 ? "eoa" : "contract",
    balanceWei: toDecimalQuantity(balance, "eth_getBalance"),
    nonce: toDecimalQuantity(nonce, "eth_getTransactionCount"),
    codeBytes,
    explorerUrl: `${MONAD_TESTNET_EXPLORER_URL}/address/${target.value}`,
  };
}

export async function inspectTransaction(
  value: string,
  client = new MonadRpcClient(),
): Promise<TransactionInspection> {
  const target = parseInspectTarget(value);
  if (target.kind !== "transaction") {
    throw new MonadRpcError("invalid-input", "Transaction inspection requires a 32-byte hash.");
  }
  const chainId = await client.assertTestnet();
  const [transaction, receipt] = await Promise.all([
    client.request<RawTransaction | null>("eth_getTransactionByHash", [target.value]),
    client.request<RawReceipt | null>("eth_getTransactionReceipt", [target.value]),
  ]);
  const common = {
    chainId,
    hash: target.value,
    explorerUrl: `${MONAD_TESTNET_EXPLORER_URL}/tx/${target.value}`,
  };

  if (!transaction && !receipt) {
    return {
      ...common,
      state: "not-found",
      status: "not-found",
      finality: "pending",
    };
  }
  if (!receipt) {
    return {
      ...common,
      state: "pending",
      status: "pending",
      finality: "pending",
      ...transactionPart(transaction),
    };
  }

  const status = receiptStatus(receipt.status);
  const blockNumber = toDecimalQuantity(receipt.blockNumber, "eth_getTransactionReceipt");
  const block = BigInt(blockNumber);
  const blocks = await client.blocks();
  const latest = BigInt(blocks.latest.number);
  const logs = receipt.logs;
  if (!Array.isArray(logs)) {
    throw new MonadRpcError("invalid-response", "Transaction receipt did not include a logs array.", {
      method: "eth_getTransactionReceipt",
    });
  }

  return {
    ...common,
    state: "confirmed",
    status,
    finality: transactionFinality(block, BigInt(blocks.safe.number), BigInt(blocks.finalized.number)),
    from: requiredAddress(receipt.from, "receipt.from"),
    to: optionalAddress(receipt.to, "receipt.to"),
    contractAddress: optionalAddress(receipt.contractAddress, "receipt.contractAddress"),
    blockNumber,
    confirmations: latest >= block ? (latest - block + 1n).toString() : "0",
    ...(receipt.gasUsed === undefined
      ? {}
      : { gasUsed: toDecimalQuantity(receipt.gasUsed, "eth_getTransactionReceipt") }),
    ...(receipt.effectiveGasPrice === undefined || receipt.effectiveGasPrice === null
      ? {}
      : { effectiveGasPriceWei: toDecimalQuantity(receipt.effectiveGasPrice, "eth_getTransactionReceipt") }),
    logCount: logs.length,
  };
}

export async function inspectTarget(
  value: string,
  client = new MonadRpcClient(),
): Promise<AddressInspection | TransactionInspection> {
  const target = parseInspectTarget(value);
  return target.kind === "address"
    ? inspectAddress(target.value, client)
    : inspectTransaction(target.value, client);
}

function transactionPart(transaction: RawTransaction | null): Pick<TransactionInspection, "from" | "to"> {
  if (!transaction) return {};
  return {
    from: requiredAddress(transaction.from, "transaction.from"),
    to: optionalAddress(transaction.to, "transaction.to"),
  };
}

function receiptStatus(value: unknown): "success" | "reverted" {
  const status = toDecimalQuantity(value, "eth_getTransactionReceipt");
  if (status === "1") return "success";
  if (status === "0") return "reverted";
  throw new MonadRpcError("invalid-response", `Transaction receipt returned unsupported status ${status}.`, {
    method: "eth_getTransactionReceipt",
    data: value,
  });
}

function transactionFinality(block: bigint, safe: bigint, finalized: bigint): TransactionFinality {
  if (block <= finalized) return "finalized";
  if (block <= safe) return "safe";
  return "latest";
}

function requiredAddress(value: unknown, field: string): Address {
  const address = optionalAddress(value, field);
  if (!address) {
    throw new MonadRpcError("invalid-response", `Monad RPC returned no ${field} address.`, {
      method: "eth_getTransactionReceipt",
      data: value,
    });
  }
  return address;
}

function optionalAddress(value: unknown, field: string): Address | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^0x[\da-f]{40}$/i.test(value)) {
    throw new MonadRpcError("invalid-response", `Monad RPC returned an invalid ${field} address.`, {
      method: "eth_getTransactionReceipt",
      data: value,
    });
  }
  return value.toLowerCase() as Address;
}

function byteLength(value: unknown, method: string): number {
  if (typeof value !== "string" || !/^0x(?:[\da-f]{2})*$/i.test(value)) {
    throw new MonadRpcError("invalid-response", `${method} returned invalid bytecode.`, { method, data: value });
  }
  return (value.length - 2) / 2;
}
