import type { ExpertRating } from "./r7";
import { adjudicationDisagreement, createAdjudicationWorkspace, createRaterWorkspace, exportRatingBundle, ratingProgress, saveRating, type RaterPacket } from "./workspace";
import { loadPacketSet, readRatingBundle, readWorkspace, replaceJson, writeNewJson } from "./workspace-files";

void main();

async function main(): Promise<void> {
  try {
    const [command, packetDir, ...args] = process.argv.slice(2);
    if (!command || !packetDir) return usage();
    const set = await loadPacketSet(packetDir);
    if (command === "init") {
      if (args.length !== 2) return usage();
      await writeNewJson(args[1]!, createRaterWorkspace(set.index, args[0]!));
      return printProgress(set.index.packetCount, 0, set.index.packets[0]?.packetId ?? null);
    }
    if (command === "init-adjudication") {
      if (args.length !== 4) return usage();
      const [first, second] = await Promise.all([readRatingBundle(args[0]!), readRatingBundle(args[1]!)]);
      const workspace = createAdjudicationWorkspace(set.index, first, second, args[2]!);
      await writeNewJson(args[3]!, workspace);
      const progress = ratingProgress(set.index, workspace);
      return printProgress(progress.total, progress.complete, progress.nextPacketId);
    }
    if (command === "status" || command === "next") {
      if (args.length !== 1) return usage();
      const workspace = await readWorkspace(args[0]!, set.index);
      const progress = ratingProgress(set.index, workspace);
      if (command === "status") return printProgress(progress.total, progress.complete, progress.nextPacketId);
      if (!progress.nextPacketId) {
        process.stdout.write("All packets are rated; export the bundle.\n");
        return;
      }
      const entry = set.packets.get(progress.nextPacketId)!;
      process.stdout.write(renderPacket(entry.filename, entry.packet, adjudicationDisagreement(workspace, progress.nextPacketId)));
      return;
    }
    if (command === "answer") {
      if (args.length < 8) return usage();
      const [workspacePath, packetId, causalRelevance, targetExpected, rewindExpected, leakage, confidence, ...reason] = args;
      const workspace = await readWorkspace(workspacePath!, set.index);
      const rating = {
        packetId: packetId!,
        causalRelevance,
        targetExpected,
        rewindExpected,
        leakage,
        confidence: Number(confidence),
        reason: reason.join(" ").trim(),
      } as ExpertRating;
      const updated = saveRating(set.index, workspace, rating);
      await replaceJson(workspacePath!, updated);
      const progress = ratingProgress(set.index, updated);
      return printProgress(progress.total, progress.complete, progress.nextPacketId);
    }
    if (command === "export") {
      if (args.length !== 2) return usage();
      const workspace = await readWorkspace(args[0]!, set.index);
      await writeNewJson(args[1]!, exportRatingBundle(set.index, workspace));
      process.stdout.write(`Exported complete blind rating bundle for ${workspace.raterId}.\n`);
      return;
    }
    usage();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

function renderPacket(filename: string, packet: RaterPacket, disagreement?: { first: ExpertRating; second: ExpertRating; fields: string[] }): string {
  const comparison = disagreement
    ? `\nADJUDICATION — disagreed fields: ${disagreement.fields.join(", ")}\nRater 1: ${JSON.stringify(disagreement.first)}\nRater 2: ${JSON.stringify(disagreement.second)}\n`
    : "";
  return [
    `${filename} — ${packet.packetId}`,
    `${packet.projectAlias} / ${packet.seam.path} / ${packet.seam.symbol} (${packet.seam.kind})`,
    `Writable: ${packet.writablePaths.join(", ")}`,
    `Tests: ${packet.attributedTestPaths.join(", ")}`,
    "",
    packet.mutationRule,
    packet.observation,
    comparison,
    "SOURCE AND TEST DIFF",
    packet.sourceAndTestDiff,
    "QUESTIONS",
    ...packet.questions.map((question, index) => `${index + 1}. ${question}`),
    "",
  ].join("\n");
}

function printProgress(total: number, complete: number, nextPacketId: string | null): void {
  process.stdout.write(`Rated ${complete}/${total}.${nextPacketId ? ` Next packet: ${nextPacketId}.` : " Complete."}\n`);
}

function usage(): void {
  process.stderr.write([
    "Usage:",
    "  node scripts/r7-rater.mjs init <packet-dir> <rater-id> <new-workspace.json>",
    "  node scripts/r7-rater.mjs next <packet-dir> <workspace.json>",
    "  node scripts/r7-rater.mjs answer <packet-dir> <workspace.json> <packet-id> <yes|no|uncertain> <pass|fail|uncertain> <pass|fail|uncertain> <none|repair|compiler-status|observed-outcome|other> <1-5> <reason>",
    "  node scripts/r7-rater.mjs status <packet-dir> <workspace.json>",
    "  node scripts/r7-rater.mjs export <packet-dir> <workspace.json> <new-bundle.json>",
    "  node scripts/r7-rater.mjs init-adjudication <packet-dir> <rater-a.json> <rater-b.json> <adjudicator-id> <new-workspace.json>",
    "",
  ].join("\n"));
  process.exitCode = 2;
}
