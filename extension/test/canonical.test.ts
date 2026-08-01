import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  canonicalJson,
  normalizeTreeFiles,
  rawSha256,
  treeHash,
  type TreeFile,
} from "../src/rnd/canonical";
import {
  R0_NODE_VERSION,
  candidateDiffHash,
  fixtureManifestHash,
  validateFixtureManifest,
  type CandidateDiff,
  type FixtureManifest,
} from "../src/twin/fixture-contract";

describe("RFC 8785 canonical hashing", () => {
  it("matches the RFC 8785 primitive and property-order vector", () => {
    const value = JSON.parse(`{
      "numbers": [333333333.33333329, 1E30, 4.50, 2e-3, 0.000000000000000000000000001],
      "string": "\\u20ac$\\u000F\\u000aA'\\u0042\\u0022\\u005c\\\\\\\"/",
      "literals": [null, true, false]
    }`);
    const expectedHex = [
      "7b226c69746572616c73223a5b6e756c6c2c747275652c66616c73655d2c226e756d62657273223a",
      "5b3333333333333333332e333333333333332c31652b33302c342e352c302e3030322c31652d3237",
      "5d2c22737472696e67223a22e282ac245c75303030665c6e4127425c225c5c5c5c5c222f227d",
    ].join("");

    expect(Buffer.from(canonicalJson(value), "utf8").toString("hex")).toBe(expectedHex);
  });

  it("rejects values outside I-JSON", () => {
    expect(() => canonicalJson(Number.NaN)).toThrow("non-finite");
    expect(() => canonicalJson({ value: undefined })).toThrow("undefined");
    expect(() => canonicalJson("\ud800")).toThrow("surrogates");
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow("cyclic");
  });

  it("uses UTF-16 property order and ECMAScript number serialization", () => {
    const value = JSON.parse(
      '{"\\u20ac":"Euro Sign","\\r":"Carriage Return","\\ufb33":"Hebrew Letter Dalet With Dagesh","1":"One","\\ud83d\\ude00":"Emoji: Grinning Face","\\u0080":"Control","\\u00f6":"Latin Small Letter O With Diaeresis"}',
    );

    expect(canonicalJson(value)).toBe(
      '{"\\r":"Carriage Return","1":"One","\u0080":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}',
    );
    expect(canonicalJson([-0, 5e-324, Number.MAX_VALUE])).toBe('[0,5e-324,1.7976931348623157e+308]');
  });

  it("separates hash domains", () => {
    const value = { schemaVersion: 1, value: "same" };
    expect(rawSha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(canonicalHash("tree", value)).not.toBe(canonicalHash("fixture-manifest", value));
  });
});

describe("R0 fixture foundations", () => {
  it("normalizes tree paths by UTF-8 bytes and matches the golden hash", () => {
    const files: TreeFile[] = [
      { path: "test/cache.test.ts", mode: "100644", sha256: rawSha256("cache test\n") },
      { path: "src/cache.ts", mode: "100644", sha256: rawSha256("cache source\n") },
    ];

    expect(normalizeTreeFiles(files).map(({ path }) => path)).toEqual(["src/cache.ts", "test/cache.test.ts"]);
    expect(treeHash(files)).toBe("ba63eb46a9e4b128b118d8e45637d63e40fb0abd0c4e2d38979d4d813728de7f");
  });

  it("matches candidate-diff and fixture-manifest golden hashes", () => {
    const manifest = sampleManifest();
    expect(manifest.knownRepair.candidateDiffHash).toBe("2e20d84bd4625f361be83df64fd06da6bdc8ae3cc4190540aca432c789276247");
    expect(fixtureManifestHash(manifest)).toBe("795b6d3d3a2dd145b03a93bf4cf9d703f873ac086f31af72e676c30c942eee71");
  });

  it("rejects ambiguous paths, ids, ordering, and runtime identities", () => {
    expect(() =>
      normalizeTreeFiles([
        { path: "src/Cache.ts", mode: "100644", sha256: "a".repeat(64) },
        { path: "src/cache.ts", mode: "100644", sha256: "b".repeat(64) },
      ]),
    ).toThrow("case-colliding");
    expect(() => normalizeTreeFiles([{ path: "../escape.ts", mode: "100644", sha256: "a".repeat(64) }])).toThrow(
      "not normalized",
    );
    expect(() =>
      normalizeTreeFiles([{ path: "src/user profile-ä.ts", mode: "100644", sha256: "a".repeat(64) }]),
    ).not.toThrow();

    const nonPortable = sampleManifest();
    nonPortable.states[0]!.files[0] = { ...nonPortable.states[0]!.files[0]!, path: "src/CON.ts" };
    nonPortable.states[0]!.files = normalizeTreeFiles(nonPortable.states[0]!.files);
    nonPortable.states[0]!.treeHash = treeHash(nonPortable.states[0]!.files);
    expect(() => validateFixtureManifest(nonPortable)).toThrow("not portable");

    const unknownCheck = sampleManifest();
    unknownCheck.targetChecks = ["missing.check"];
    expect(() => validateFixtureManifest(unknownCheck)).toThrow("Unknown target check");

    const unsorted = sampleManifest();
    unsorted.knownRepair.candidateDiff.changes = [
      { ...unsorted.knownRepair.candidateDiff.changes[0]!, path: "src/z.ts" },
      { ...unsorted.knownRepair.candidateDiff.changes[0]!, path: "src/a.ts" },
    ];
    expect(() => validateFixtureManifest(unsorted)).toThrow("sorted");

    expect(() =>
      validateFixtureManifest(sampleManifest(), {
        handle: "fixture-node",
        version: "v24.13.1",
        executableSha256: "f".repeat(64),
      }),
    ).toThrow("runtime identity");
  });

  it("rejects unversioned fields and non-canonical set ordering", () => {
    const injected = sampleManifest() as FixtureManifest & { injected?: number };
    injected.injected = 1;
    expect(() => fixtureManifestHash(injected)).toThrow("unknown or missing fields");

    const injectedFile = file("source\n") as TreeFile & { injected?: number };
    injectedFile.injected = 1;
    expect(() => treeHash([injectedFile])).toThrow("unknown or missing fields");

    const envOrder = sampleManifest();
    envOrder.commands[0]!.envAllowlist = ["ZED", "ALPHA"];
    expect(() => validateFixtureManifest(envOrder)).toThrow("sorted");

    const stateOrder = sampleManifest();
    stateOrder.commands.push({ ...stateOrder.commands[0]!, id: "lint", label: "Lint" });
    stateOrder.states[0]!.commandIds = ["lint", "cache-key.test"];
    expect(() => validateFixtureManifest(stateOrder)).toThrow("sorted");

    const pathOrder = sampleManifest();
    const stable = { path: "src/aaa.ts", mode: "100644" as const, sha256: rawSha256("stable\n") };
    for (const state of pathOrder.states) {
      state.files = normalizeTreeFiles([...state.files, stable]);
      state.treeHash = treeHash(state.files);
    }
    pathOrder.mutation.editablePaths = ["src/cache-key.ts", "src/aaa.ts"];
    expect(() => validateFixtureManifest(pathOrder)).toThrow("sorted");
  });

  it("binds checks to commands allowed by each fixture state", () => {
    const manifest = sampleManifest();
    manifest.commands.push({ ...manifest.commands[0]!, id: "mutated-only", label: "Mutated-only check" });
    manifest.checks.push({ id: "mutated-only.check", commandId: "mutated-only" });
    manifest.targetChecks.push("mutated-only.check");

    expect(() => validateFixtureManifest(manifest)).toThrow("not runnable in target state");
  });

  it("rejects normalized-but-invalid timestamps and incomplete identity fields", () => {
    const timestamp = sampleManifest();
    timestamp.git.authorDate = "2026-02-30T00:00:00.000Z";
    expect(() => validateFixtureManifest(timestamp)).toThrow("Invalid UTC");

    const mutation = sampleManifest();
    mutation.mutation.id = "";
    expect(() => validateFixtureManifest(mutation)).toThrow("Mutation id");

    const repair = sampleManifest();
    (repair.knownRepair as { resultingState: string }).resultingState = "base";
    expect(() => validateFixtureManifest(repair)).toThrow("resulting state");
  });
});

function sampleManifest(): FixtureManifest {
  const baseFile = file("export function cacheKey(id: string) { return id; }\n");
  const targetFile = file("export function cacheKey(tenant: string, id: string) { return `${tenant}:${id}`; }\n");
  const mutatedFile = file("export function cacheKey(_tenant: string, id: string) { return id; }\n");
  const testFile = { path: "test/cache-key.test.ts", mode: "100644" as const, sha256: rawSha256("tenant isolation\n") };
  const baseFiles = normalizeTreeFiles([baseFile, testFile]);
  const targetFiles = normalizeTreeFiles([targetFile, testFile]);
  const mutatedFiles = normalizeTreeFiles([mutatedFile, testFile]);

  const candidateDiff: CandidateDiff = {
    schemaVersion: 1,
    baseTreeHash: treeHash(mutatedFiles),
    resultTreeHash: treeHash(targetFiles),
    changes: [
      {
        path: "src/cache-key.ts",
        beforeSha256: mutatedFile.sha256,
        afterSha256: targetFile.sha256,
        beforeMode: "100644",
        afterMode: "100644",
      },
    ],
  };

  return {
    schemaVersion: 1,
    fixtureId: "tenant-cache-key",
    stack: "node-typescript",
    defaultBranch: "main",
    baseRevision: "1".repeat(40),
    targetRevision: "2".repeat(40),
    changedSymbols: [{ path: "src/cache-key.ts", symbol: "cacheKey" }],
    commands: [
      {
        schemaVersion: 1,
        id: "cache-key.test",
        label: "Tenant cache-key check",
        runner: "trusted-fixture",
        fixtureId: "tenant-cache-key",
        toolchainHandle: "fixture-node",
        args: ["harness.mjs", "cache-key.tenant-isolation"],
        cwd: ".",
        timeoutMs: 5_000,
        envAllowlist: [],
        maxOutputBytes: 16_384,
        network: "not-enforced-reviewed-fixture",
      },
    ],
    checks: [{ id: "cache-key.tenant-isolation", commandId: "cache-key.test" }],
    baseChecks: ["cache-key.tenant-isolation"],
    targetChecks: ["cache-key.tenant-isolation"],
    mutation: {
      id: "drop-tenant-from-cache-key",
      changeRef: blob("mutation.patch", "mutation\n", "controller", "text/x-diff"),
      expectedFailingChecks: ["cache-key.tenant-isolation"],
      editablePaths: ["src/cache-key.ts"],
    },
    knownRepair: {
      changeRef: blob("repair.patch", "repair\n", "controller", "text/x-diff"),
      candidateDiff,
      candidateDiffHash: candidateDiffHash(candidateDiff),
      resultingState: "target",
    },
    states: [
      { id: "base", treeHash: treeHash(baseFiles), files: baseFiles, commandIds: ["cache-key.test"] },
      { id: "target", treeHash: treeHash(targetFiles), files: targetFiles, commandIds: ["cache-key.test"] },
      { id: "mutated", treeHash: treeHash(mutatedFiles), files: mutatedFiles, commandIds: ["cache-key.test"] },
    ],
    git: {
      autocrlf: false,
      eol: "lf",
      userName: "PureFlow Fixture",
      userEmail: "fixture@pureflow.invalid",
      authorDate: "2026-01-01T00:00:00.000Z",
      committerDate: "2026-01-01T00:00:00.000Z",
      objectFormat: "sha1",
    },
    toolchain: {
      nodeVersion: R0_NODE_VERSION,
      dependencies: "none",
      harness: blob("harness.mjs", "harness\n", "controller", "text/javascript"),
      oracle: blob("oracle.json", "oracle\n", "oracle", "application/json"),
    },
  };
}

function file(source: string): TreeFile {
  return { path: "src/cache-key.ts", mode: "100644", sha256: rawSha256(source) };
}

function blob(id: string, bytes: string, visibility: "controller" | "oracle", mediaType: string) {
  return { id, sha256: rawSha256(bytes), storedBytes: Buffer.byteLength(bytes), mediaType, visibility };
}
