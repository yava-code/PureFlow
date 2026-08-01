import { readFile, stat } from "node:fs/promises";
import { rawSha256 } from "../rnd/canonical";
import {
  EXPECTED_TENANT_CACHE_KEY,
  loadTenantCacheKeyManifest,
  tenantCacheKeyControllerAssets,
} from "./fixture-factory";
import { fixtureManifestHash, validateFixtureManifest, type FixtureBlobRef } from "./fixture-contract";
import { openFixtureNodeRuntime, type InstalledFixtureRuntime } from "./fixture-runtime";
import type { TrustedFixtureRecord } from "./types";

export class BuiltinFixtureCatalog {
  private record?: Promise<TrustedFixtureRecord>;
  private runtime?: InstalledFixtureRuntime;

  async open(fixtureId: string, manifestHash: string): Promise<TrustedFixtureRecord | undefined> {
    if (
      fixtureId !== "tenant-cache-key" ||
      manifestHash !== EXPECTED_TENANT_CACHE_KEY.manifestHash
    ) {
      return undefined;
    }
    return structuredClone(await (this.record ??= this.load()));
  }

  async openForSnapshot(sourceRevision: string, mutationId: string): Promise<TrustedFixtureRecord | undefined> {
    const record = await this.open("tenant-cache-key", EXPECTED_TENANT_CACHE_KEY.manifestHash);
    if (
      !record ||
      record.manifest.targetRevision !== sourceRevision ||
      record.manifest.mutation.id !== mutationId
    ) {
      return undefined;
    }
    return record;
  }

  async resolveNode(record: TrustedFixtureRecord): Promise<string> {
    const current = await this.open(record.manifest.fixtureId, record.manifestHash);
    if (!current || current.node.executableSha256 !== record.node.executableSha256) {
      throw new Error("Trusted fixture runtime record changed after catalog validation");
    }
    const runtime = this.runtime;
    if (!runtime || runtime.executableSha256 !== record.node.executableSha256) {
      throw new Error("Trusted fixture runtime is not open");
    }
    return runtime.executablePath;
  }

  private async load(): Promise<TrustedFixtureRecord> {
    const [manifest, runtime] = await Promise.all([
      loadTenantCacheKeyManifest(),
      openFixtureNodeRuntime(),
    ]);
    validateFixtureManifest(manifest, {
      handle: runtime.handle,
      version: runtime.version,
      executableSha256: runtime.executableSha256,
    });
    const manifestHash = fixtureManifestHash(manifest);
    if (manifestHash !== EXPECTED_TENANT_CACHE_KEY.manifestHash) {
      throw new Error("Built-in fixture manifest hash changed");
    }
    this.runtime = runtime;

    const handles = tenantCacheKeyControllerAssets();
    const record: TrustedFixtureRecord = {
      manifestHash,
      manifest,
      node: {
        handle: "fixture-node",
        version: runtime.version,
        executableSha256: runtime.executableSha256,
      },
      blobs: {
        harness: { localHandle: handles.harness, ref: manifest.toolchain.harness },
        oracle: { localHandle: handles.oracle, ref: manifest.toolchain.oracle },
        mutation: { localHandle: handles.mutation, ref: manifest.mutation.changeRef },
        repair: { localHandle: handles.repair, ref: manifest.knownRepair.changeRef },
      },
    };

    await Promise.all([
      verifyBlob(record.blobs.harness.localHandle, record.blobs.harness.ref),
      verifyBlob(record.blobs.oracle.localHandle, record.blobs.oracle.ref),
      verifyBlob(record.blobs.mutation.localHandle, record.blobs.mutation.ref),
      verifyBlob(record.blobs.repair.localHandle, record.blobs.repair.ref),
    ]);
    return record;
  }
}

async function verifyBlob(path: string, ref: FixtureBlobRef): Promise<void> {
  const info = await stat(path);
  if (!info.isFile()) throw new Error(`Fixture blob is not a regular file: ${ref.id}`);
  const bytes = await readFile(path);
  if (bytes.byteLength !== ref.storedBytes || rawSha256(bytes) !== ref.sha256) {
    throw new Error(`Fixture blob does not match its committed reference: ${ref.id}`);
  }
}
