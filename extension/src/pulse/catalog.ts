import { assertToken } from "../agent/types";
import { assertExactKeys, assertSha256, canonicalHash, canonicalJson, compareUtf8 } from "../rnd/canonical";
import { EXPECTED_TENANT_CACHE_KEY } from "../twin/fixture-factory";
import type {
  CatalogControlProbe,
  FixtureControlProbe,
  ParticipantControlProbe,
  ParticipantProbeSurface,
  ValidatedClaim,
} from "./types";
import {
  assertCatalogControlProbe,
  assertFixtureControlProbe,
  assertParticipantControlProbe,
  assertProbeSurface,
} from "./validate";

interface CatalogEntry {
  probe: CatalogControlProbe;
  label: string;
}

const entries: CatalogEntry[] = [{
  probe: {
    schemaVersion: 1,
    id: "tenant-isolation-boundary",
    fixtureId: "tenant-cache-key",
    fixtureManifestHash: EXPECTED_TENANT_CACHE_KEY.manifestHash,
    state: "mutated",
    checkId: "cache-key.tenant-isolation",
    prompt: "Before the check runs: will tenant isolation hold for two tenants sharing the same id?",
  },
  label: "Run the tenant-isolation boundary check",
}];

export class FixtureControlProbeCatalog {
  list(fixtureId: string, fixtureManifestHash: string): CatalogControlProbe[] {
    const values = entries
      .filter(({ probe }) => probe.fixtureId === fixtureId && probe.fixtureManifestHash === fixtureManifestHash)
      .map(({ probe }) => structuredClone(probe))
      .sort((left, right) => compareUtf8(left.id, right.id));
    values.forEach(assertCatalogControlProbe);
    return values;
  }

  open(id: string, fixtureId: string, fixtureManifestHash: string): CatalogControlProbe | undefined {
    const entry = entries.find(({ probe }) =>
      probe.id === id && probe.fixtureId === fixtureId && probe.fixtureManifestHash === fixtureManifestHash,
    );
    if (!entry) return undefined;
    assertCatalogControlProbe(entry.probe);
    return structuredClone(entry.probe);
  }

  surface(fixtureId: string, fixtureManifestHash: string): ParticipantProbeSurface {
    const selected = entries
      .filter(({ probe }) => probe.fixtureId === fixtureId && probe.fixtureManifestHash === fixtureManifestHash)
      .sort((left, right) => compareUtf8(left.probe.id, right.probe.id));
    if (selected.length === 0) throw new Error("Fixture has no allowlisted control probes");
    const prompts = new Set(selected.map(({ probe }) => probe.prompt));
    if (prompts.size !== 1) throw new Error("Catalog probe prompts do not form one committed surface");
    const surface = {
      prompt: selected[0]!.probe.prompt,
      inputs: selected.map(({ probe, label }) => ({ id: probe.id, label })),
    };
    assertProbeSurface(surface);
    return surface;
  }
}

export interface PublishedFixtureProbe {
  internal: FixtureControlProbe;
  internalProbeHash: string;
  participant: ParticipantControlProbe;
}

export class FixtureControlProbeStore {
  private readonly values = new Map<string, PublishedFixtureProbe>();

  publish(value: PublishedFixtureProbe): PublishedFixtureProbe {
    assertPublished(value);
    const key = `${value.internal.projectId}/${value.internal.id}/${value.internalProbeHash}`;
    const current = this.values.get(key);
    if (current && canonicalJson(current) !== canonicalJson(value)) {
      throw new Error("Published control probe is immutable");
    }
    this.values.set(key, structuredClone(value));
    return structuredClone(value);
  }

  open(projectId: string, id: string, hash: string): PublishedFixtureProbe | undefined {
    const value = this.values.get(`${projectId}/${id}/${hash}`);
    return value ? structuredClone(value) : undefined;
  }
}

export function publishFixtureControlProbe(input: {
  id: string;
  projectId: string;
  claim: ValidatedClaim;
  sourceTreeHash: string;
  catalog: FixtureControlProbeCatalog;
  store: FixtureControlProbeStore;
}): PublishedFixtureProbe {
  assertToken(input.id, "probeId");
  assertToken(input.projectId, "projectId");
  assertSha256(input.sourceTreeHash, "sourceTreeHash");
  const fixtureId = "tenant-cache-key";
  const fixtureManifestHash = EXPECTED_TENANT_CACHE_KEY.manifestHash;
  const internal: FixtureControlProbe = {
    schemaVersion: 1,
    mode: "fixture",
    id: input.id,
    projectId: input.projectId,
    claimHash: input.claim.claimHash,
    sourceTreeHash: input.sourceTreeHash,
    fixtureId,
    fixtureManifestHash,
    participant: input.catalog.surface(fixtureId, fixtureManifestHash),
  };
  assertFixtureControlProbe(internal);
  const internalProbeHash = canonicalHash("control-probe", internal);
  const participant: ParticipantControlProbe = {
    schemaVersion: 1,
    id: internal.id,
    internalProbeHash,
    claim: structuredClone(input.claim.claim),
    participant: structuredClone(internal.participant),
  };
  assertParticipantControlProbe(participant);
  return input.store.publish({ internal, internalProbeHash, participant });
}

export function serializeParticipantControlProbe(value: ParticipantControlProbe): string {
  assertParticipantControlProbe(value);
  return canonicalJson(value);
}

export function assertParticipantProjection(
  published: PublishedFixtureProbe,
  participant: ParticipantControlProbe,
): void {
  assertPublished(published);
  assertParticipantControlProbe(participant);
  if (canonicalJson(participant) !== canonicalJson(published.participant)) {
    throw new Error("Participant control probe projection changed");
  }
}

function assertPublished(value: PublishedFixtureProbe): void {
  assertExactKeys(value, ["internal", "internalProbeHash", "participant"], "published fixture probe");
  assertFixtureControlProbe(value.internal);
  assertSha256(value.internalProbeHash, "internalProbeHash");
  assertParticipantControlProbe(value.participant);
  if (canonicalHash("control-probe", value.internal) !== value.internalProbeHash) {
    throw new Error("Internal control probe hash changed");
  }
  if (
    value.participant.id !== value.internal.id ||
    value.participant.internalProbeHash !== value.internalProbeHash ||
    canonicalHash("control-claim", value.participant.claim) !== value.internal.claimHash ||
    canonicalJson(value.participant.participant) !== canonicalJson(value.internal.participant)
  ) {
    throw new Error("Participant control probe projection changed");
  }
}
