import type { SandboxToolchain, SandboxToolchainCatalog } from "./types";

export const R7_NODE_IMAGE = "node@sha256:b04ce4ae4e95b522112c2e5c52f781471a5cbc3b594527bcddedee9bc48c03a0";

export class NodeSandboxToolchainCatalog implements SandboxToolchainCatalog {
  async open(handle: string): Promise<SandboxToolchain | undefined> {
    if (handle !== "node-22-r7") return undefined;
    return { image: R7_NODE_IMAGE, entrypoint: "node" };
  }
}
