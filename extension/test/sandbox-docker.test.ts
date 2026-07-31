import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { rawSha256 } from "../src/rnd/canonical";
import {
  DockerCliBackend,
  DockerSandboxRunner,
  MemoryExecutionConsent,
  MemorySandboxCommandAuthority,
  MemorySandboxMountAuthority,
  MemorySandboxWorkspaceAuthority,
  NodeSandboxToolchainCatalog,
  R7_NODE_IMAGE,
  type IsolatedCommand,
} from "../src/sandbox";
import { MemoryCommandEvidenceStore } from "../src/twin/commands";

const enabled = process.env.PUREFLOW_DOCKER_INTEGRATION === "1";
const roots: string[] = [];

afterAll(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe.skipIf(!enabled)("DockerSandboxRunner integration", () => {
  it("proves the selected Docker backend capabilities", async () => {
    const capabilities = await new DockerCliBackend().capabilities(R7_NODE_IMAGE);
    expect(capabilities.imageDigest).toBe(R7_NODE_IMAGE);
    expect(capabilities.capabilities).toEqual({
      networkNone: true,
      hostFilesystemIsolated: true,
      readOnlyOracleMount: true,
      processTreeKill: true,
      resourceLimits: true,
    });
  }, 90_000);

  it("executes a frozen command with spaces in the mounted path and cleans up", async () => {
    const root = await mkdtemp(join(tmpdir(), "pureflow r7 integration "));
    roots.push(root);
    const twin = join(root, "sanitized twin");
    const oracle = join(root, "oracle file.json");
    await mkdir(join(twin, ".pureflow"), { recursive: true });
    await mkdir(join(twin, "tmp"), { recursive: true });
    await writeFile(join(twin, ".pureflow", "oracle.json"), "");
    await writeFile(oracle, "oracle-v1");

    const command: IsolatedCommand = {
      schemaVersion: 1,
      id: "node-smoke",
      label: "Node smoke",
      toolchainHandle: "node-22-r7",
      args: ["-e", "console.log(JSON.stringify({cwd:process.cwd(),ci:process.env.CI,secret:process.env.GITHUB_TOKEN||null}))"],
      cwd: ".",
      timeoutMs: 10_000,
      envAllowlist: ["CI", "NODE_ENV", "NO_COLOR"],
      maxOutputBytes: 4_096,
      runner: "sandbox",
      network: "none",
    };
    const commands = new MemorySandboxCommandAuthority();
    commands.add("docker-project", command);
    const workspaces = new MemorySandboxWorkspaceAuthority();
    workspaces.add("docker-project", "docker-twin", { root: twin, trusted: true });
    const mounts = new MemorySandboxMountAuthority();
    mounts.add("docker-project", "oracle", oracle);
    const consent = new MemoryExecutionConsent();
    consent.grant("docker-project");
    const evidence = new MemoryCommandEvidenceStore();
    const runner = new DockerSandboxRunner({
      commands,
      workspaces,
      mounts,
      consent,
      toolchains: new NodeSandboxToolchainCatalog(),
      backend: new DockerCliBackend(),
      evidence,
    });
    const result = await runner.run({
      executionId: "docker-smoke-1",
      projectId: "docker-project",
      twinHandle: "docker-twin",
      command,
      writablePaths: ["tmp"],
      readOnlyMounts: [{ localHandle: "oracle", mountAt: ".pureflow/oracle.json", sha256: rawSha256("oracle-v1") }],
      hostMountAllowlist: ["oracle"],
    });
    const output = await evidence.open("docker-project", result.stdout);
    expect(result).toMatchObject({ exitCode: 0, timedOut: false, cancelled: false });
    expect(JSON.parse(output!.trim())).toEqual({ cwd: "/workspace", ci: "1", secret: null });
  }, 90_000);
});
