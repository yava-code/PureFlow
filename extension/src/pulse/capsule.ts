import { assertBoundedText, assertObjectShape, assertRecord } from "../agent/types";
import { assertExactKeys, assertSha256, canonicalJson } from "../rnd/canonical";
import type {
  ParticipantControlProbe,
  SideCoachCapsule,
  SideCoachProposal,
  ValidatedClaim,
} from "./types";
import { assertParticipantControlProbe, assertProbeSurface } from "./validate";

const windowsPath = /(?:[A-Za-z]:\\|\\\\)[^\s"'<>]+/g;
const unixPath = /(?:^|[\s("'])(\/(?:home|Users|opt|var|tmp|workspace|repo)\/[^\s"')<>]+)/g;
const secret = /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b/g;

export async function buildSideCoachCapsule(
  participant: ParticipantControlProbe,
  validated: ValidatedClaim,
  developerAnswer: string,
): Promise<SideCoachCapsule> {
  assertParticipantControlProbe(participant);
  assertBoundedText(developerAnswer, 4096, "developer answer");
  if (canonicalJson(participant.claim) !== canonicalJson(validated.claim)) {
    throw new Error("Side Coach claim projection changed");
  }
  if (participant.internalProbeHash.length !== 64) throw new Error("Side Coach probe binding is invalid");

  const ids = new Set(validated.evidence.map(({ ref }) => ref.id));
  const evidence = validated.evidence.slice(0, 4).map(({ ref, content }) => ({
    kind: ref.kind,
    sha256: ref.sha256,
    mediaType: ref.mediaType,
    excerpt: truncateUtf8(scrub(content, ids), 2048),
  }));
  const claim = {
    intent: validated.claim.intent,
    changedBehavior: validated.claim.changedBehavior,
    boundary: structuredClone(validated.claim.boundary),
    invariant: validated.claim.invariant,
    ...(validated.claim.unresolvedAssumption === undefined
      ? {}
      : { unresolvedAssumption: validated.claim.unresolvedAssumption }),
  };
  const capsule: SideCoachCapsule = {
    schemaVersion: 1,
    claimHash: validated.claimHash,
    claim,
    evidence,
    probe: structuredClone(participant.participant),
    developerAnswer,
  };
  assertSideCoachCapsule(capsule);
  if (Buffer.byteLength(canonicalJson(capsule)) > 16_384) throw new Error("Side Coach capsule exceeds 16384 bytes");
  return capsule;
}

export function validateSideCoachProposal(value: unknown, capsule: SideCoachCapsule): SideCoachProposal {
  assertSideCoachCapsule(capsule);
  assertRecord(value, "Side Coach proposal");
  assertObjectShape(value, ["schemaVersion", "hypothesis"], ["probeInputId", "clarification"], "Side Coach proposal");
  if (value.schemaVersion !== 1) throw new Error("Unsupported Side Coach proposal");
  assertBoundedText(value.hypothesis, 2048, "Side Coach hypothesis");
  if (value.probeInputId !== undefined) {
    assertBoundedText(value.probeInputId, 128, "Side Coach probe input ID");
    if (!capsule.probe.inputs.some(({ id }) => id === value.probeInputId)) {
      throw new Error("Side Coach proposal selected an unknown probe input");
    }
  }
  if (value.clarification !== undefined) assertBoundedText(value.clarification, 2048, "Side Coach clarification");
  if (Buffer.byteLength(canonicalJson(value)) > 4096) throw new Error("Side Coach proposal exceeds 4096 bytes");
  return structuredClone(value) as unknown as SideCoachProposal;
}

function assertSideCoachCapsule(value: unknown): asserts value is SideCoachCapsule {
  assertRecord(value, "Side Coach capsule");
  assertExactKeys(value, ["schemaVersion", "claimHash", "claim", "evidence", "probe", "developerAnswer"], "Side Coach capsule");
  if (value.schemaVersion !== 1) throw new Error("Unsupported Side Coach capsule");
  assertSha256(String(value.claimHash), "claimHash");
  assertRecord(value.claim, "Side Coach claim");
  assertObjectShape(value.claim, ["intent", "changedBehavior", "boundary", "invariant"], ["unresolvedAssumption"], "Side Coach claim");
  assertBoundedText(value.claim.intent, 1024, "claim intent");
  assertBoundedText(value.claim.changedBehavior, 1024, "changed behavior");
  assertBoundedText(value.claim.invariant, 1024, "claim invariant");
  if (value.claim.unresolvedAssumption !== undefined) assertBoundedText(value.claim.unresolvedAssumption, 1024, "unresolved assumption");
  assertRecord(value.claim.boundary, "claim boundary");
  assertExactKeys(value.claim.boundary, ["path", "symbol"], "claim boundary");
  if (!Array.isArray(value.evidence) || value.evidence.length > 4) throw new Error("Side Coach evidence is invalid");
  for (const item of value.evidence) {
    assertRecord(item, "Side Coach evidence item");
    assertExactKeys(item, ["kind", "sha256", "mediaType", "excerpt"], "Side Coach evidence item");
    assertSha256(String(item.sha256), "evidence hash");
    assertBoundedText(item.mediaType, 128, "evidence media type");
    assertBoundedText(item.excerpt, 2048, "evidence excerpt");
  }
  assertProbeSurface(value.probe);
  assertBoundedText(value.developerAnswer, 4096, "developer answer");
}

function scrub(value: string, ids: Set<string>): string {
  let text = value.replace(windowsPath, "[local-path]");
  text = text.replace(unixPath, (match, path: string) => match.replace(path, "[local-path]"));
  text = text.replace(secret, "[secret]");
  for (const id of ids) text = text.replaceAll(id, "[evidence]");
  return text;
}

function truncateUtf8(value: string, maxBytes: number): string {
  let result = value;
  while (Buffer.byteLength(result) > maxBytes) result = result.slice(0, -1);
  return result;
}
