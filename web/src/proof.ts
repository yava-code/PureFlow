import type { Hex } from "viem";

const monadChainId = 10_143;

export interface PreparedAttestation {
  version: 1;
  chainId: 10_143;
  commitment: Hex;
  focusedSeconds: number;
  testRuns: number;
  debugLoops: number;
  ownership: 1 | 2 | 3;
}

export type AttestationHash =
  | { kind: "none" }
  | { kind: "invalid"; error: string }
  | { kind: "prepared"; encoded: string; payload: PreparedAttestation };

export function readAttestationHash(hash: string): AttestationHash {
  const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("attest");
  if (!encoded) return { kind: "none" };
  try {
    if (encoded.length > 2_048) throw new Error("Prepared proof payload is too large.");
    const decoded = decodeBase64Url(encoded);
    const value = JSON.parse(decoded) as unknown;
    return { kind: "prepared", encoded, payload: parseAttestation(value) };
  } catch (cause) {
    return {
      kind: "invalid",
      error: cause instanceof Error ? cause.message : "The prepared proof payload is invalid.",
    };
  }
}

export function payloadText(payload: PreparedAttestation) {
  return JSON.stringify(payload, null, 2);
}

function parseAttestation(value: unknown): PreparedAttestation {
  if (!isRecord(value)) throw new Error("Prepared proof must be a JSON object.");
  if (value.version !== 1) throw new Error("Prepared proof version must be 1.");
  if (value.chainId !== monadChainId) throw new Error(`Prepared proof must target Monad Testnet (${monadChainId}).`);
  if (typeof value.commitment !== "string" || !/^0x[\da-fA-F]{64}$/.test(value.commitment)) {
    throw new Error("Prepared proof has an invalid 32-byte commitment.");
  }
  if (/^0x0{64}$/i.test(value.commitment)) throw new Error("Prepared proof commitment cannot be zero.");
  integerInRange(value.focusedSeconds, 1, 86_400, "focusedSeconds");
  integerInRange(value.testRuns, 0, 65_535, "testRuns");
  integerInRange(value.debugLoops, 0, 65_535, "debugLoops");
  integerInRange(value.ownership, 1, 3, "ownership");
  return {
    version: 1,
    chainId: monadChainId,
    commitment: value.commitment,
    focusedSeconds: value.focusedSeconds,
    testRuns: value.testRuns,
    debugLoops: value.debugLoops,
    ownership: value.ownership,
  } as PreparedAttestation;
}

function decodeBase64Url(value: string) {
  if (!/^[\w-]+$/.test(value)) throw new Error("Prepared proof is not valid base64url.");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function integerInRange(value: unknown, min: number, max: number, name: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`Prepared proof has an invalid ${name}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
