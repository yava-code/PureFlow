import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { validateRatingIndex, type RatingBundle, type RatingIndex } from "./r7";
import { validatePacket, validateWorkspace, type RaterPacket, type RatingWorkspace } from "./workspace";

export interface PacketSet {
  dir: string;
  index: RatingIndex;
  packets: Map<string, { filename: string; packet: RaterPacket }>;
}

export async function loadPacketSet(packetDir: string): Promise<PacketSet> {
  const dir = resolve(packetDir);
  const names = await readdir(dir, { withFileTypes: true });
  const index = JSON.parse(await readFile(join(dir, "index.json"), "utf8")) as RatingIndex;
  validateRatingIndex(index);
  const allowed = new Set(["index.json", ...index.packets.map(({ filename }) => filename)]);
  const unexpected = names.filter((entry) => !entry.isFile() || !allowed.has(entry.name));
  if (unexpected.length) throw new Error(`Blind packet directory contains unexpected content: ${unexpected.map(({ name }) => name).join(", ")}`);

  const packets = new Map<string, { filename: string; packet: RaterPacket }>();
  for (const entry of index.packets) {
    const packet = JSON.parse(await readFile(join(dir, entry.filename), "utf8")) as RaterPacket;
    validatePacket(index, packet, entry.filename);
    packets.set(packet.packetId, { filename: entry.filename, packet });
  }
  return { dir, index, packets };
}

export async function readWorkspace(path: string, index: RatingIndex): Promise<RatingWorkspace> {
  const workspace = JSON.parse(await readFile(resolve(path), "utf8")) as RatingWorkspace;
  validateWorkspace(index, workspace);
  return workspace;
}

export async function readRatingBundle(path: string): Promise<RatingBundle> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as RatingBundle;
}

export async function writeNewJson(path: string, value: unknown): Promise<void> {
  await writeFile(resolve(path), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

export async function replaceJson(path: string, value: unknown): Promise<void> {
  await writeFile(resolve(path), `${JSON.stringify(value, null, 2)}\n`, { flag: "w" });
}
