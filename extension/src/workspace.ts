import * as vscode from "vscode";
import { safeFileLabel } from "./privacy";
import type { WorkspaceSnapshot } from "./types";

export type { WorkspaceSnapshot } from "./types";

interface GitChange {
  uri?: vscode.Uri;
}

interface GitState {
  HEAD?: { name?: string };
  indexChanges?: GitChange[];
  workingTreeChanges?: GitChange[];
  mergeChanges?: GitChange[];
}

interface GitRepository {
  rootUri: vscode.Uri;
  state: GitState;
}

interface GitApi {
  repositories: GitRepository[];
}

interface GitExtension {
  getAPI(version: 1): GitApi;
}

interface GitSnapshot {
  branch: string;
  changedFiles: number;
}

type ProjectTemplate = "empty" | "typescript" | "monad-hardhat";

export class WorkspaceService {
  async snapshot(): Promise<WorkspaceSnapshot> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;
    const selected = editor && selection && !selection.isEmpty
      ? editor.document.getText(selection)
      : "";
    const git = await this.gitSnapshot(editor?.document.uri);

    return {
      hasWorkspace: folders.length > 0,
      name: vscode.workspace.name ?? folders[0]?.name ?? "No project open",
      folders: folders.map((folder) => folder.name),
      currentFile: editor
        ? documentLabel(editor.document)
        : "",
      language: editor?.document.languageId ?? "",
      gitBranch: git?.branch ?? "",
      dirty: Boolean(git?.changedFiles),
      hasSelection: Boolean(selected),
      selectionLines: selected
        ? `${selection!.end.line - selection!.start.line + 1} ${selection!.end.line === selection!.start.line ? "line" : "lines"}`
        : undefined,
      selectionChars: selected.length,
    };
  }

  async openProject(): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Open project in PureFlow",
      title: "Open a project",
    });
    const folder = picked?.[0];
    if (folder) await vscode.commands.executeCommand("vscode.openFolder", folder, false);
  }

  async createProject(): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Choose parent folder",
      title: "Where should PureFlow create the project?",
      defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
    });
    const parent = picked?.[0];
    if (!parent) return;

    const template = await vscode.window.showQuickPick(
      [
        { label: "Empty project", description: "A folder and README", value: "empty" as const },
        { label: "Node + TypeScript", description: "src, tests, scripts, and strict TypeScript", value: "typescript" as const },
        { label: "Monad + Hardhat", description: "Solidity starter configured for Monad Testnet", value: "monad-hardhat" as const },
      ],
      { title: "Create a project", placeHolder: "Choose a starting point" },
    );
    if (!template) return;

    const name = await vscode.window.showInputBox({
      title: "Create a project",
      prompt: "Project folder name",
      placeHolder: "my-project",
      ignoreFocusOut: true,
      validateInput: validateProjectName,
    });
    if (!name) return;

    const target = vscode.Uri.joinPath(parent, name.trim());
    if (await exists(target)) {
      void vscode.window.showErrorMessage(`A folder named “${name.trim()}” already exists.`);
      return;
    }

    await vscode.workspace.fs.createDirectory(target);
    await writeProject(target, name.trim(), template.value);
    await vscode.commands.executeCommand("vscode.openFolder", target, false);
  }

  openTerminal(): void {
    if (vscode.window.activeTerminal) {
      vscode.window.activeTerminal.show();
      return;
    }
    const editorFolder = vscode.window.activeTextEditor
      ? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
      : undefined;
    const cwd = editorFolder?.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
    vscode.window.createTerminal({ name: "PureFlow", cwd }).show();
  }

  private async gitSnapshot(uri?: vscode.Uri): Promise<GitSnapshot | undefined> {
    try {
      const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
      if (!extension) return undefined;
      const exports = extension.isActive ? extension.exports : await extension.activate();
      const repositories = exports.getAPI(1).repositories;
      const repository = repositories.find((item) => uri && contains(item.rootUri, uri)) ?? repositories[0];
      if (!repository) return undefined;
      const state = repository.state;
      return {
        branch: state.HEAD?.name ?? "detached",
        changedFiles: new Set([
          ...(state.indexChanges ?? []),
          ...(state.workingTreeChanges ?? []),
          ...(state.mergeChanges ?? []),
        ].map((change) => change.uri?.toString()).filter(Boolean)).size,
      };
    } catch {
      return undefined;
    }
  }
}

function documentLabel(document: vscode.TextDocument): string {
  const folder = document.isUntitled ? undefined : vscode.workspace.getWorkspaceFolder(document.uri);
  const relative = folder ? vscode.workspace.asRelativePath(document.uri, false) : undefined;
  return safeFileLabel(document.fileName, relative);
}

function validateProjectName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return "Enter a project name.";
  if (name === "." || name === ".." || /[<>:"/\\|?*\u0000-\u001f]/.test(name)) {
    return "Use a folder name without path separators or reserved characters.";
  }
  return undefined;
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

function contains(root: vscode.Uri, uri: vscode.Uri): boolean {
  if (root.scheme !== uri.scheme || root.authority !== uri.authority) return false;
  const rootPath = root.path.endsWith("/") ? root.path : `${root.path}/`;
  return uri.path === root.path || uri.path.startsWith(rootPath);
}

async function writeProject(root: vscode.Uri, name: string, template: ProjectTemplate): Promise<void> {
  const files = projectFiles(name, template);
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split("/");
    if (parts.length > 1) await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(root, ...parts.slice(0, -1)));
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(root, ...parts), Buffer.from(content, "utf8"));
  }
}

function projectFiles(name: string, template: ProjectTemplate): Record<string, string> {
  const title = name.replace(/[-_]+/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
  if (template === "empty") {
    return { "README.md": `# ${title}\n\nCreated with PureFlow.\n` };
  }
  if (template === "typescript") {
    return {
      "package.json": `${JSON.stringify({
        name: packageName(name),
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: { build: "tsc", test: "node --test --import tsx" },
        devDependencies: { "@types/node": "^22.17.0", tsx: "^4.20.0", typescript: "^5.9.0" },
      }, null, 2)}\n`,
      "tsconfig.json": `${JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, outDir: "dist" }, include: ["src", "test"] }, null, 2)}\n`,
      "src/index.ts": "export function greet(name: string): string {\n  return `Hello, ${name}.`;\n}\n",
      "test/index.test.ts": "import assert from \"node:assert/strict\";\nimport test from \"node:test\";\nimport { greet } from \"../src/index.js\";\n\ntest(\"greets by name\", () => {\n  assert.equal(greet(\"PureFlow\"), \"Hello, PureFlow.\");\n});\n",
      ".gitignore": "node_modules/\ndist/\n.env\n",
      "README.md": `# ${title}\n\n\`npm install\` then \`npm test\`.\n`,
    };
  }
  return {
    "package.json": `${JSON.stringify({
      name: packageName(name),
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: { build: "hardhat build --build-profile production", test: "hardhat test solidity" },
      devDependencies: {
        "@nomicfoundation/hardhat-toolbox-viem": "^5.0.7",
        "@types/node": "^22.17.0",
        hardhat: "^3.10.0",
        typescript: "~6.0.3",
        viem: "^2.47.6",
      },
    }, null, 2)}\n`,
    "hardhat.config.ts": `import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";\nimport { configVariable, defineConfig } from "hardhat/config";\n\nexport default defineConfig({\n  plugins: [hardhatToolboxViemPlugin],\n  paths: { sources: "./src", tests: "./test" },\n  solidity: { profiles: { default: { version: "0.8.28" }, production: { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 200 } } } } },\n  networks: {\n    hardhatMainnet: { type: "edr-simulated", chainType: "l1" },\n    monadTestnet: {\n      type: "http",\n      chainType: "l1",\n      chainId: 10143,\n      url: "https://testnet-rpc.monad.xyz",\n      accounts: [configVariable("MONAD_TESTNET_PRIVATE_KEY")],\n    },\n  },\n});\n`,
    "src/Counter.sol": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.28;\n\ncontract Counter {\n    uint256 public value;\n\n    function increment() external {\n        value++;\n    }\n}\n",
    "test/Counter.t.sol": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.28;\n\nimport {Counter} from \"../src/Counter.sol\";\n\ncontract CounterTest {\n    function testIncrement() public {\n        Counter counter = new Counter();\n        counter.increment();\n        require(counter.value() == 1, \"counter did not increment\");\n    }\n}\n",
    ".gitignore": "node_modules/\nartifacts/\ncache/\n.env\n",
    ".env.example": "MONAD_TESTNET_PRIVATE_KEY=\n",
    "README.md": `# ${title}\n\nMonad Testnet starter created with PureFlow.\n\n- Chain ID: \`10143\`\n- RPC: \`https://testnet-rpc.monad.xyz\`\n\nRun \`npm install\`, \`npm test\`, then use **PureFlow: Run Monad Project Doctor**. Keep private keys in environment variables only.\n`,
  };
}

function packageName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "pureflow-project";
}
