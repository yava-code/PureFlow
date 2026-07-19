export const MONAD_TESTNET_CHAIN_ID = 10_143;
export const MONAD_TESTNET_RPC_URL = "https://testnet-rpc.monad.xyz";
export const MONAD_TESTNET_EXPLORER_URL = "https://testnet.monadscan.com";

export type Hex = `0x${string}`;
export type Address = `0x${string}`;
export type TransactionHash = `0x${string}`;
export type MonadBlockTag = "latest" | "safe" | "finalized";

export type MonadRpcErrorKind =
  | "invalid-input"
  | "timeout"
  | "network"
  | "http"
  | "rpc"
  | "invalid-response"
  | "wrong-chain";

export interface MonadRpcErrorContext {
  method?: string;
  status?: number;
  rpcCode?: number;
  data?: unknown;
}

export class MonadRpcError extends Error {
  readonly kind: MonadRpcErrorKind;
  readonly context: MonadRpcErrorContext;

  constructor(
    kind: MonadRpcErrorKind,
    message: string,
    context: MonadRpcErrorContext = {},
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "MonadRpcError";
    this.kind = kind;
    this.context = context;
  }
}

export interface MonadTransportRequest {
  id: number;
  url: string;
  method: string;
  params: readonly unknown[];
  signal: AbortSignal;
}

export type MonadTransport = (request: MonadTransportRequest) => Promise<unknown>;

export interface MonadRpcOptions {
  rpcUrl?: string;
  timeoutMs?: number;
  transport?: MonadTransport;
}

export interface MonadBlockRef {
  tag: MonadBlockTag;
  number: string;
  hash: Hex | null;
  timestamp: number;
  baseFeePerGasWei?: string;
}

export interface MonadFeeSnapshot {
  gasPriceWei: string;
  maxPriorityFeePerGasWei: string;
  baseFeePerGasWei?: string;
}

export interface MonadNetworkSnapshot {
  chainId: number;
  rpcUrl: string;
  latencyMs: number;
  blocks: Record<MonadBlockTag, MonadBlockRef>;
  headLag: {
    safe: string;
    finalized: string;
  };
  fees: MonadFeeSnapshot;
}

export interface AddressInspection {
  chainId: number;
  address: Address;
  blockTag: MonadBlockTag;
  kind: "eoa" | "contract";
  balanceWei: string;
  nonce: string;
  codeBytes: number;
  explorerUrl: string;
}

export type TransactionState = "not-found" | "pending" | "confirmed";
export type TransactionStatus = "not-found" | "pending" | "success" | "reverted";
export type TransactionFinality = "pending" | "latest" | "safe" | "finalized";

export interface TransactionInspection {
  chainId: number;
  hash: TransactionHash;
  state: TransactionState;
  status: TransactionStatus;
  finality: TransactionFinality;
  explorerUrl: string;
  from?: Address;
  to?: Address | null;
  contractAddress?: Address | null;
  blockNumber?: string;
  confirmations?: string;
  gasUsed?: string;
  effectiveGasPriceWei?: string;
  logCount?: number;
}

export interface ProjectEntry {
  name: string;
  kind: "file" | "directory" | "other";
}

export interface ProjectReader {
  readDirectory(path: string): Promise<readonly ProjectEntry[]>;
  readFile(path: string): Promise<string>;
}

export interface MonadProjectScanOptions {
  reader?: ProjectReader;
  maxDepth?: number;
  maxFiles?: number;
}

export type ProjectTechnology = "hardhat" | "foundry" | "solidity" | "wagmi" | "viem";

export interface ProjectEvidence {
  technology: ProjectTechnology;
  path: string;
  reason: string;
}

export interface ProjectScanIssue {
  code: "scan-limit" | "unreadable-directory" | "unreadable-file" | "invalid-package-json";
  path: string;
  message: string;
}

export interface MonadProjectScan {
  root: string;
  filesScanned: number;
  truncated: boolean;
  technologies: Record<ProjectTechnology, boolean>;
  evidence: ProjectEvidence[];
  solidityFiles: string[];
  packageFiles: string[];
  configFiles: string[];
  monadConfigFiles: string[];
  issues: ProjectScanIssue[];
}

export class MonadProjectError extends Error {
  readonly code: "invalid-root" | "root-unreadable";
  readonly path: string;

  constructor(code: "invalid-root" | "root-unreadable", path: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MonadProjectError";
    this.code = code;
    this.path = path;
  }
}
