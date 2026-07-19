import {
  MONAD_TESTNET_CHAIN_ID,
  MONAD_TESTNET_RPC_URL,
  MonadRpcError,
  type Hex,
  type MonadBlockRef,
  type MonadBlockTag,
  type MonadFeeSnapshot,
  type MonadNetworkSnapshot,
  type MonadRpcOptions,
  type MonadTransport,
  type MonadTransportRequest,
} from "./types";

const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_TIMEOUT_MS = 30_000;

interface JsonRpcEnvelope {
  jsonrpc?: unknown;
  id?: unknown;
  result?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
    data?: unknown;
  };
}

interface RawBlock {
  number?: unknown;
  hash?: unknown;
  timestamp?: unknown;
  baseFeePerGas?: unknown;
}

export class MonadRpcClient {
  readonly rpcUrl: string;
  readonly timeoutMs: number;
  private readonly transport: MonadTransport;
  private nextId = 1;

  constructor(options: MonadRpcOptions = {}) {
    this.rpcUrl = validateRpcUrl(options.rpcUrl ?? MONAD_TESTNET_RPC_URL);
    this.timeoutMs = normalizeTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    this.transport = options.transport ?? fetchTransport;
  }

  async request<T = unknown>(method: string, params: readonly unknown[] = []): Promise<T> {
    if (!method.trim()) {
      throw new MonadRpcError("invalid-input", "RPC method cannot be empty.");
    }

    const controller = new AbortController();
    const id = this.nextId++;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new MonadRpcError(
            "timeout",
            `Monad RPC did not answer ${method} within ${this.timeoutMs}ms.`,
            { method },
          ),
        );
      }, this.timeoutMs);
    });

    const call: MonadTransportRequest = {
      id,
      url: this.rpcUrl,
      method,
      params,
      signal: controller.signal,
    };

    try {
      return (await Promise.race([this.transport(call), timeout])) as T;
    } catch (error) {
      if (error instanceof MonadRpcError) throw error;
      if (isAbortError(error)) {
        throw new MonadRpcError("timeout", `Monad RPC timed out while calling ${method}.`, { method }, { cause: error });
      }
      throw new MonadRpcError("network", `Monad RPC request ${method} failed.`, { method }, { cause: error });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async chainId(): Promise<number> {
    const value = await this.request<unknown>("eth_chainId");
    const chainId = toSafeNumber(value, "eth_chainId");
    return chainId;
  }

  async assertTestnet(): Promise<number> {
    const chainId = await this.chainId();
    if (chainId !== MONAD_TESTNET_CHAIN_ID) {
      throw new MonadRpcError(
        "wrong-chain",
        `Expected Monad Testnet (${MONAD_TESTNET_CHAIN_ID}), but RPC reported chain ${chainId}.`,
        { method: "eth_chainId", data: { expected: MONAD_TESTNET_CHAIN_ID, actual: chainId } },
      );
    }
    return chainId;
  }

  async block(tag: MonadBlockTag): Promise<MonadBlockRef> {
    const raw = await this.request<RawBlock | null>("eth_getBlockByNumber", [tag, false]);
    if (!raw) {
      throw new MonadRpcError("invalid-response", `Monad RPC returned no ${tag} block.`, {
        method: "eth_getBlockByNumber",
      });
    }
    return parseBlock(tag, raw);
  }

  async blocks(): Promise<Record<MonadBlockTag, MonadBlockRef>> {
    const [latest, safe, finalized] = await Promise.all([
      this.block("latest"),
      this.block("safe"),
      this.block("finalized"),
    ]);
    return { latest, safe, finalized };
  }

  async fees(latest?: MonadBlockRef): Promise<MonadFeeSnapshot> {
    const [gasPrice, priority, head] = await Promise.all([
      this.request<unknown>("eth_gasPrice"),
      this.request<unknown>("eth_maxPriorityFeePerGas"),
      latest ? Promise.resolve(latest) : this.block("latest"),
    ]);
    return {
      gasPriceWei: toDecimalQuantity(gasPrice, "eth_gasPrice"),
      maxPriorityFeePerGasWei: toDecimalQuantity(priority, "eth_maxPriorityFeePerGas"),
      ...(head.baseFeePerGasWei ? { baseFeePerGasWei: head.baseFeePerGasWei } : {}),
    };
  }

  async networkSnapshot(): Promise<MonadNetworkSnapshot> {
    const started = performance.now();
    const [chainId, blocks] = await Promise.all([this.assertTestnet(), this.blocks()]);
    const fees = await this.fees(blocks.latest);
    const latest = BigInt(blocks.latest.number);
    return {
      chainId,
      rpcUrl: this.rpcUrl,
      latencyMs: Math.max(0, Math.round(performance.now() - started)),
      blocks,
      headLag: {
        safe: nonNegativeDelta(latest, BigInt(blocks.safe.number)).toString(),
        finalized: nonNegativeDelta(latest, BigInt(blocks.finalized.number)).toString(),
      },
      fees,
    };
  }
}

export function toDecimalQuantity(value: unknown, method = "RPC"): string {
  return parseQuantity(value, method).toString();
}

export function toSafeNumber(value: unknown, method = "RPC"): number {
  const parsed = parseQuantity(value, method);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new MonadRpcError("invalid-response", `${method} returned a number larger than JavaScript can represent safely.`, {
      method,
      data: value,
    });
  }
  return Number(parsed);
}

async function fetchTransport(request: MonadTransportRequest): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(request.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        method: request.method,
        params: request.params,
      }),
      signal: request.signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new MonadRpcError(
      "network",
      `Could not reach Monad RPC for ${request.method}.`,
      { method: request.method },
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new MonadRpcError("http", `Monad RPC returned HTTP ${response.status}.`, {
      method: request.method,
      status: response.status,
    });
  }

  let payload: JsonRpcEnvelope;
  try {
    payload = (await response.json()) as JsonRpcEnvelope;
  } catch (error) {
    throw new MonadRpcError(
      "invalid-response",
      "Monad RPC returned invalid JSON.",
      { method: request.method },
      { cause: error },
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new MonadRpcError("invalid-response", "Monad RPC returned an invalid response envelope.", {
      method: request.method,
    });
  }
  if (payload.error) {
    const rpcCode = typeof payload.error.code === "number" ? payload.error.code : undefined;
    const message = typeof payload.error.message === "string" ? payload.error.message : "Unknown RPC error";
    throw new MonadRpcError("rpc", `Monad RPC rejected ${request.method}: ${message}`, {
      method: request.method,
      ...(rpcCode === undefined ? {} : { rpcCode }),
      data: payload.error.data,
    });
  }
  if (!("result" in payload)) {
    throw new MonadRpcError("invalid-response", "Monad RPC response did not include a result.", {
      method: request.method,
    });
  }
  return payload.result;
}

function parseBlock(tag: MonadBlockTag, raw: RawBlock): MonadBlockRef {
  const number = toDecimalQuantity(raw.number, "eth_getBlockByNumber");
  const timestamp = toSafeNumber(raw.timestamp, "eth_getBlockByNumber");
  const hash = raw.hash === null ? null : asHex(raw.hash, "eth_getBlockByNumber");
  return {
    tag,
    number,
    hash,
    timestamp,
    ...(raw.baseFeePerGas === undefined || raw.baseFeePerGas === null
      ? {}
      : { baseFeePerGasWei: toDecimalQuantity(raw.baseFeePerGas, "eth_getBlockByNumber") }),
  };
}

function parseQuantity(value: unknown, method: string): bigint {
  if (typeof value !== "string" || !/^0x[\da-f]+$/i.test(value)) {
    throw new MonadRpcError("invalid-response", `${method} returned an invalid hex quantity.`, {
      method,
      data: value,
    });
  }
  return BigInt(value);
}

function asHex(value: unknown, method: string): Hex {
  if (typeof value !== "string" || !/^0x[\da-f]+$/i.test(value)) {
    throw new MonadRpcError("invalid-response", `${method} returned invalid hex data.`, {
      method,
      data: value,
    });
  }
  return value as Hex;
}

function validateRpcUrl(value: string): string {
  const normalized = value.trim();
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("unsupported protocol");
  } catch (error) {
    throw new MonadRpcError("invalid-input", "Monad RPC URL must be an HTTP or HTTPS URL.", {}, { cause: error });
  }
  return normalized;
}

function normalizeTimeout(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new MonadRpcError("invalid-input", "Monad RPC timeout must be a positive number.");
  }
  return Math.min(Math.round(value), MAX_TIMEOUT_MS);
}

function nonNegativeDelta(head: bigint, block: bigint): bigint {
  return head > block ? head - block : 0n;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
