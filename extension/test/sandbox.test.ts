import { link, mkdtemp, mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rawSha256 } from "../src/rnd/canonical";
import {
  DockerSandboxRunner,
  DockerCliBackend,
  MemoryExecutionConsent,
  MemorySandboxCommandAuthority,
  MemorySandboxMountAuthority,
  MemorySandboxWorkspaceAuthority,
  NodeSandboxToolchainCatalog,
  assertSandboxRequest,
  type DockerExecution,
  type DockerExecutionPlan,
  type DockerSandboxBackend,
  type IsolatedCommand,
  type SandboxCapabilities,
  type SandboxRequest,
} from "../src/sandbox";
import { MemoryCommandEvidenceStore } from "../src/twin/commands";

const IMAGE = "node@sha256:b04ce4ae4e95b522112c2e5c52f781471a5cbc3b594527bcddedee9bc48c03a0";
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("SandboxRunner contract", () => {
  it("never targets a caller-named Docker container", async () => {
    const backend = new DockerCliBackend();
    await expect(backend.kill("postgres-production")).rejects.toThrow(/controller-owned/i);
    await expect(backend.cleanup("pureflow-r7-*")).rejects.toThrow(/controller-owned/i);
  });

  it("rejects unknown fields, unsorted arrays, duplicate paths, and unsafe command bounds", () => {
    const valid = request();
    expect(() => assertSandboxRequest(valid)).not.toThrow();
    expect(() => assertSandboxRequest({ ...valid, surprise: true })).toThrow(/unknown or missing fields/i);
    expect(() => assertSandboxRequest({ ...valid, writablePaths: ["tmp/z", "tmp/a"] })).toThrow(/sorted/i);
    expect(() => assertSandboxRequest({ ...valid, writablePaths: ["tmp/a", "tmp/a"] })).toThrow(/unique/i);
    expect(() => assertSandboxRequest({
      ...valid,
      command: { ...valid.command, timeoutMs: 999 },
    })).toThrow(/timeout/i);
    expect(() => assertSandboxRequest({
      ...valid,
      command: { ...valid.command, args: Array.from({ length: 129 }, () => "x") },
    })).toThrow(/args/i);
  });

  it.each([
    ["command drift", { command: { ...command(), args: ["different.js"] } }, undefined, true],
    ["untrusted workspace", {}, { trusted: false }, true],
    ["missing consent", {}, undefined, false],
  ])("fails closed before Docker on %s", async (_label, patch, workspacePatch, consent = true) => {
    const kit = await setup({ consent, workspacePatch });
    await expect(kit.runner.run({ ...request(), ...patch })).rejects.toThrow();
    expect(kit.backend.plans).toHaveLength(0);
  });

  it("emits the pinned, shell-free isolation profile from controller authorities", async () => {
    const kit = await setup();
    const result = await kit.runner.run(request());
    const plan = kit.backend.plans[0]!;

    expect(plan).toMatchObject({
      image: IMAGE,
      entrypoint: "node",
      args: ["test/run.mjs"],
      cwd: "/workspace/app",
      env: { CI: "1", NODE_ENV: "test", NO_COLOR: "1" },
      network: "none",
      readOnlyRoot: true,
      user: "65532:65532",
      capDrop: ["ALL"],
      securityOpt: ["no-new-privileges"],
      memoryBytes: 134_217_728,
      nanoCpus: 500_000_000,
      pidsLimit: 64,
    });
    expect(plan.mounts.map(({ target, readOnly }) => ({ target, readOnly }))).toEqual([
      { target: "/workspace", readOnly: true },
      { target: "/workspace/.pureflow/oracle.json", readOnly: true },
    ]);
    expect(plan.tmpfs).toEqual([
      { target: "/tmp", options: "rw,noexec,nosuid,size=16777216" },
      { target: "/workspace/tmp", options: "rw,noexec,nosuid,size=16777216" },
    ]);
    expect(JSON.stringify(plan)).not.toContain("production");
    expect(result).toMatchObject({
      executionId: "exec-1",
      commandId: "test",
      exitCode: 0,
      timedOut: false,
      cancelled: false,
    });
  });

  it("rejects mount allowlist drift and oracle integrity changes", async () => {
    const kit = await setup();
    await expect(kit.runner.run({ ...request(), hostMountAllowlist: [] })).rejects.toThrow(/allowlist/i);
    expect(kit.backend.plans).toHaveLength(0);

    const changed = await setup();
    changed.backend.onRun = async (plan) => {
      await writeFile(changed.oracle, "changed");
      return completed(plan);
    };
    await expect(changed.runner.run(request())).rejects.toThrow(/integrity/i);

    const remapped = await setup();
    remapped.backend.onRun = async (plan) => {
      await writeFile(remapped.oracle, "changed");
      const replacement = join(remapped.root, "replacement.json");
      await writeFile(replacement, "oracle-v1");
      remapped.mounts.add("project-1", "oracle-1", replacement);
      return completed(plan);
    };
    await expect(remapped.runner.run(request())).rejects.toThrow(/integrity/i);
  });

  it("requires controller-created mountpoints before Docker starts", async () => {
    const kit = await setup();
    await unlink(join(kit.twin, ".pureflow", "oracle.json"));
    await expect(kit.runner.run(request())).rejects.toThrow(/target/i);
    expect(kit.backend.plans).toHaveLength(0);
  });

  it("rejects hard-linked workspace files before Docker starts", async () => {
    const kit = await setup();
    await link(join(kit.twin, "app", "test.mjs"), join(kit.twin, "app", "alias.mjs"));
    await expect(kit.runner.run(request())).rejects.toThrow(/private regular files/i);
    expect(kit.backend.plans).toHaveLength(0);
  });

  it("redacts and truncates stdout and stderr independently", async () => {
    const bounded = { ...command(), maxOutputBytes: 64 };
    const kit = await setup({ approvedCommand: bounded });
    kit.backend.onRun = async (plan) => completed(plan, {
      stdout: Buffer.from(`ok ghp_${"a".repeat(40)} ${"x".repeat(200)}`),
      stderr: Buffer.from("Authorization: Bearer secret-token\n"),
    });
    const result = await kit.runner.run({
      ...request(),
      command: bounded,
    });
    const stdout = await kit.evidence.open("project-1", result.stdout);
    const stderr = await kit.evidence.open("project-1", result.stderr);

    expect(stdout).not.toContain("ghp_");
    expect(stderr).not.toContain("secret-token");
    expect(result.stdout.storedBytes).toBeLessThanOrEqual(64);
    expect(result.stdout.originalBytes).toBeGreaterThan(result.stdout.storedBytes);
    expect(result.stdout.truncated).toBe(true);
    expect(result.stdout.redactions).toEqual([{ ruleId: "github-token", count: 1 }]);
    expect(result.stderr.redactions).toEqual([{ ruleId: "bearer-token", count: 1 }]);
  });

  it("never truncates command evidence inside a UTF-8 code point", async () => {
    const bounded = { ...command(), maxOutputBytes: 5 };
    const kit = await setup({ approvedCommand: bounded });
    kit.backend.onRun = async (plan) => completed(plan, { stdout: Buffer.from("éééé") });
    const result = await kit.runner.run({ ...request(), command: bounded });
    expect(await kit.evidence.open("project-1", result.stdout)).toBe("éé");
    expect(result.stdout.storedBytes).toBe(4);
  });

  it("tombstones every attempt and never reuses an execution ID", async () => {
    const kit = await setup();
    await kit.runner.run(request());
    await expect(kit.runner.run(request())).rejects.toThrow(/reused/i);
    expect(kit.backend.plans).toHaveLength(1);

    const rejected = await setup({ capabilities: { networkNone: false } });
    await expect(rejected.runner.run(request())).rejects.toThrow(/capabilit/i);
    rejected.backend.capabilitySet = allCapabilities();
    await expect(rejected.runner.run(request())).rejects.toThrow(/reused/i);
  });

  it("cancels only the recorded execution while another run completes", async () => {
    const kit = await setup();
    const gates = new Map<string, { resolve: (value: DockerExecution) => void }>();
    kit.backend.onRun = (plan) => new Promise((resolve) => gates.set(plan.executionId, { resolve }));
    const first = kit.runner.run(request());
    const second = kit.runner.run({ ...request(), executionId: "exec-2" });
    await until(() => gates.size === 2);

    await kit.runner.cancel("exec-1");
    const firstPlan = kit.backend.plans.find((plan) => plan.executionId === "exec-1")!;
    const secondPlan = kit.backend.plans.find((plan) => plan.executionId === "exec-2")!;
    expect(kit.backend.kills).toEqual([firstPlan.containerName]);
    gates.get("exec-1")!.resolve(completed(firstPlan, { cancelled: true, exitCode: null }));
    gates.get("exec-2")!.resolve(completed(secondPlan));
    await expect(first).resolves.toMatchObject({ cancelled: true, timedOut: false, exitCode: null });
    await expect(second).resolves.toMatchObject({ cancelled: false, timedOut: false, exitCode: 0 });
  });

  it("returns a timeout only with a null exit code", async () => {
    const kit = await setup();
    kit.backend.onRun = async (plan) => completed(plan, { timedOut: true, exitCode: null });
    await expect(kit.runner.run(request())).resolves.toMatchObject({
      exitCode: null,
      timedOut: true,
      cancelled: false,
    });
  });

  it("surfaces cleanup failure instead of successful evidence", async () => {
    const kit = await setup();
    kit.backend.cleaned = false;
    await expect(kit.runner.run(request())).rejects.toThrow(/cleanup/i);
    expect(kit.backend.cleanups).toHaveLength(1);
  });

  it("treats Docker setup exit codes as infrastructure errors", async () => {
    const kit = await setup();
    kit.backend.onRun = async (plan) => completed(plan, { exitCode: 125 });
    await expect(kit.runner.run(request())).rejects.toThrow(/infrastructure/i);
  });
});

class FakeDockerBackend implements DockerSandboxBackend {
  capabilitySet: SandboxCapabilities;
  plans: DockerExecutionPlan[] = [];
  kills: string[] = [];
  cleanups: string[] = [];
  cleaned = true;
  onRun: (plan: DockerExecutionPlan) => Promise<DockerExecution> = async (plan) => completed(plan);

  constructor(capabilities = allCapabilities()) {
    this.capabilitySet = capabilities;
  }

  async capabilities(image: string) {
    return {
      backendId: "fake-linux",
      imageDigest: image,
      measuredAt: "2026-08-01T00:00:00.000Z",
      capabilities: this.capabilitySet,
    };
  }

  async run(plan: DockerExecutionPlan) {
    this.plans.push(structuredClone(plan));
    return this.onRun(plan);
  }

  async kill(containerName: string) {
    this.kills.push(containerName);
  }

  async cleanup(containerName: string) {
    this.cleanups.push(containerName);
    return this.cleaned;
  }
}

async function setup(options: {
  consent?: boolean;
  workspacePatch?: { trusted: boolean };
  capabilities?: Partial<SandboxCapabilities>;
  approvedCommand?: IsolatedCommand;
} = {}) {
  const root = await mkdtemp(join(tmpdir(), "pureflow-sandbox-test-"));
  roots.push(root);
  const twin = join(root, "sanitized-twin");
  const oracle = join(root, "oracle.json");
  await mkdir(join(twin, "app"), { recursive: true });
  await mkdir(join(twin, ".pureflow"), { recursive: true });
  await mkdir(join(twin, "tmp"), { recursive: true });
  await writeFile(join(twin, "app", "test.mjs"), "console.log('ok')\n");
  await writeFile(join(twin, ".pureflow", "oracle.json"), "");
  await writeFile(oracle, "oracle-v1");
  const commands = new MemorySandboxCommandAuthority();
  commands.add("project-1", options.approvedCommand ?? command());
  const workspaces = new MemorySandboxWorkspaceAuthority();
  workspaces.add("project-1", "twin-1", { root: twin, trusted: options.workspacePatch?.trusted ?? true });
  const mounts = new MemorySandboxMountAuthority();
  mounts.add("project-1", "oracle-1", oracle);
  const consent = new MemoryExecutionConsent();
  if (options.consent ?? true) consent.grant("project-1");
  const capabilities = { ...allCapabilities(), ...options.capabilities };
  const backend = new FakeDockerBackend(capabilities);
  const evidence = new MemoryCommandEvidenceStore();
  const runner = new DockerSandboxRunner({
    commands,
    workspaces,
    mounts,
    consent,
    toolchains: new NodeSandboxToolchainCatalog(),
    backend,
    evidence,
    now: () => new Date("2026-08-01T00:00:01.000Z"),
  });
  return { runner, backend, evidence, mounts, root, twin, oracle };
}

function command(): IsolatedCommand {
  return {
    schemaVersion: 1,
    id: "test",
    label: "Run test",
    toolchainHandle: "node-22-r7",
    args: ["test/run.mjs"],
    cwd: "app",
    timeoutMs: 10_000,
    envAllowlist: ["CI", "NODE_ENV", "NO_COLOR"],
    maxOutputBytes: 1_024,
    runner: "sandbox",
    network: "none",
  };
}

function request(): SandboxRequest {
  return {
    executionId: "exec-1",
    projectId: "project-1",
    twinHandle: "twin-1",
    command: command(),
    writablePaths: ["tmp"],
    readOnlyMounts: [{
      localHandle: "oracle-1",
      mountAt: ".pureflow/oracle.json",
      sha256: rawSha256("oracle-v1"),
    }],
    hostMountAllowlist: ["oracle-1"],
  };
}

function allCapabilities(): SandboxCapabilities {
  return {
    networkNone: true,
    hostFilesystemIsolated: true,
    readOnlyOracleMount: true,
    processTreeKill: true,
    resourceLimits: true,
  };
}

function completed(plan: DockerExecutionPlan, patch: Partial<DockerExecution> = {}): DockerExecution {
  return {
    containerName: plan.containerName,
    exitCode: 0,
    timedOut: false,
    cancelled: false,
    stdout: Buffer.from("ok\n"),
    stderr: Buffer.alloc(0),
    stdoutOriginalBytes: patch.stdout?.byteLength ?? 3,
    stderrOriginalBytes: patch.stderr?.byteLength ?? 0,
    ...patch,
  };
}

async function until(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for test state");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
