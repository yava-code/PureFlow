import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MonadRpcClient,
  inspectAddress,
  inspectTransaction,
  scanMonadProject,
  type MonadTransport,
  type ProjectEntry,
  type ProjectReader,
} from "../src/monad";

describe("Monad RPC", () => {
  it("reads testnet block states and fee data", async () => {
    const client = new MonadRpcClient({
      transport: responseTransport({
        eth_chainId: "0x279f",
        "eth_getBlockByNumber:latest": block("0x66", "0x5f5e100"),
        "eth_getBlockByNumber:safe": block("0x65"),
        "eth_getBlockByNumber:finalized": block("0x64"),
        eth_gasPrice: "0x77359400",
        eth_maxPriorityFeePerGas: "0x3b9aca00",
      }),
    });

    const snapshot = await client.networkSnapshot();

    expect(snapshot).toMatchObject({
      chainId: 10_143,
      headLag: { safe: "1", finalized: "2" },
      fees: {
        gasPriceWei: "2000000000",
        maxPriorityFeePerGasWei: "1000000000",
        baseFeePerGasWei: "100000000",
      },
    });
    expect(snapshot.blocks.latest.number).toBe("102");
  });

  it("rejects an RPC connected to the wrong chain", async () => {
    const client = new MonadRpcClient({ transport: responseTransport({ eth_chainId: "0x1" }) });
    await expect(client.assertTestnet()).rejects.toMatchObject({ kind: "wrong-chain" });
  });

  it("bounds a stalled transport with a typed timeout", async () => {
    const transport: MonadTransport = () => new Promise(() => undefined);
    const client = new MonadRpcClient({ transport, timeoutMs: 5 });
    await expect(client.chainId()).rejects.toMatchObject({ kind: "timeout" });
  });
});

describe("Monad inspector", () => {
  it("inspects an address without returning bytecode", async () => {
    const client = new MonadRpcClient({
      transport: responseTransport({
        eth_chainId: "0x279f",
        eth_getBalance: "0xde0b6b3a7640000",
        eth_getTransactionCount: "0x2",
        eth_getCode: "0x60016002",
      }),
    });

    const result = await inspectAddress("0x1111111111111111111111111111111111111111", client);

    expect(result).toMatchObject({
      chainId: 10_143,
      kind: "contract",
      balanceWei: "1000000000000000000",
      nonce: "2",
      codeBytes: 4,
      blockTag: "safe",
    });
    expect(result).not.toHaveProperty("code");
  });

  it("reports receipt status, finality, confirmations, and log count", async () => {
    const from = "0x1111111111111111111111111111111111111111";
    const to = "0x2222222222222222222222222222222222222222";
    const hash = `0x${"a".repeat(64)}`;
    const client = new MonadRpcClient({
      transport: responseTransport({
        eth_chainId: "0x279f",
        eth_getTransactionByHash: { from, to, blockNumber: "0x65" },
        eth_getTransactionReceipt: {
          status: "0x1",
          from,
          to,
          contractAddress: null,
          blockNumber: "0x65",
          gasUsed: "0x5208",
          effectiveGasPrice: "0x77359400",
          logs: [{}, {}],
        },
        "eth_getBlockByNumber:latest": block("0x66"),
        "eth_getBlockByNumber:safe": block("0x65"),
        "eth_getBlockByNumber:finalized": block("0x64"),
      }),
    });

    const result = await inspectTransaction(hash, client);

    expect(result).toMatchObject({
      state: "confirmed",
      status: "success",
      finality: "safe",
      blockNumber: "101",
      confirmations: "2",
      gasUsed: "21000",
      effectiveGasPriceWei: "2000000000",
      logCount: 2,
    });
  });
});

describe("Monad project scan", () => {
  it("detects Hardhat, Foundry, Solidity, wagmi, and viem deterministically", async () => {
    const root = resolve("virtual-monad-workspace");
    const directories = new Map<string, ProjectEntry[]>([
      [".", [dir("web"), file("foundry.toml"), dir("contracts"), file("hardhat.config.ts"), dir("node_modules")]],
      ["contracts", [dir("src")]],
      ["contracts/src", [file("Registry.sol")]],
      ["web", [file("wagmi.config.ts"), file("package.json")]],
    ]);
    const files = new Map<string, string>([
      ["foundry.toml", "[profile.default]\nsrc = 'contracts/src'"],
      ["hardhat.config.ts", "export default { networks: { monad: { chainId: 10143 } } }"],
      ["contracts/src/Registry.sol", "pragma solidity ^0.8.28; contract Registry {}"],
      ["web/wagmi.config.ts", "import { monadTestnet } from 'wagmi/chains'"],
      ["web/package.json", JSON.stringify({ dependencies: { wagmi: "3.0.0", viem: "2.0.0" } })],
    ]);
    const reader: ProjectReader = {
      async readDirectory(location) {
        const key = projectRelative(root, location);
        const entries = directories.get(key);
        if (!entries) throw new Error(`missing directory ${key}`);
        return entries;
      },
      async readFile(location) {
        const key = projectRelative(root, location);
        const value = files.get(key);
        if (value === undefined) throw new Error(`missing file ${key}`);
        return value;
      },
    };

    const result = await scanMonadProject(root, { reader });

    expect(result.technologies).toEqual({
      hardhat: true,
      foundry: true,
      solidity: true,
      wagmi: true,
      viem: true,
    });
    expect(result.solidityFiles).toEqual(["contracts/src/Registry.sol"]);
    expect(result.configFiles).toEqual(["foundry.toml", "hardhat.config.ts", "web/wagmi.config.ts"]);
    expect(result.monadConfigFiles).toEqual(["hardhat.config.ts", "web/wagmi.config.ts"]);
    expect(result.issues).toEqual([]);
    expect(result.truncated).toBe(false);
  });
});

function responseTransport(responses: Record<string, unknown>): MonadTransport {
  return async ({ method, params }) => {
    const key = method === "eth_getBlockByNumber" ? `${method}:${String(params[0])}` : method;
    if (!(key in responses)) throw new Error(`Unexpected RPC method ${key}`);
    return responses[key];
  };
}

function block(number: string, baseFeePerGas?: string) {
  return {
    number,
    hash: `0x${"b".repeat(64)}`,
    timestamp: "0x66800000",
    ...(baseFeePerGas ? { baseFeePerGas } : {}),
  };
}

function file(name: string): ProjectEntry {
  return { name, kind: "file" };
}

function dir(name: string): ProjectEntry {
  return { name, kind: "directory" };
}

function projectRelative(root: string, location: string): string {
  const value = relative(root, location).replaceAll("\\", "/");
  return value || ".";
}
