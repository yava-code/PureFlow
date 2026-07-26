import { createHash } from "node:crypto";

export type FileMode = "100644" | "100755";

export interface TreeFile {
  path: string;
  mode: FileMode;
  sha256: string;
}

export function rawSha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value: unknown): string {
  return encode(value, new Set());
}

export function canonicalHash(domain: string, value: unknown): string {
  if (!domain || domain.includes("\n") || domain.includes("\r")) {
    throw new Error("Canonical hash domain must be a non-empty line");
  }

  return rawSha256(`pureflow/v0.3/${domain}\n${canonicalJson(value)}`);
}

export function compareUtf8(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function assertRelPath(value: string, allowRoot = false): void {
  if (allowRoot && value === ".") {
    return;
  }
  if (
    !value ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.startsWith("/") ||
    value.startsWith("//") ||
    /^[A-Za-z]:/.test(value)
  ) {
    throw new Error(`Invalid relative path: ${value}`);
  }

  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Relative path is not normalized: ${value}`);
  }
}

export function assertPortableFixturePath(value: string, allowRoot = false): void {
  assertRelPath(value, allowRoot);
  if (allowRoot && value === ".") {
    return;
  }

  for (const part of value.split("/")) {
    if (
      !/^[A-Za-z0-9._@+-]+$/.test(part) ||
      part.endsWith(".") ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
    ) {
      throw new Error(`Fixture path is not portable across Windows and Linux: ${value}`);
    }
  }
}

export function assertSha256(value: string, label = "SHA-256"): void {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error(`${label} must be lowercase hex SHA-256`);
  }
}

export function normalizeTreeFiles(files: readonly TreeFile[]): TreeFile[] {
  const sorted = files
    .map((file) => {
      assertExactKeys(file, ["path", "mode", "sha256"], "tree file");
      return { path: file.path, mode: file.mode, sha256: file.sha256 };
    })
    .sort((a, b) => compareUtf8(a.path, b.path));
  const paths = new Set<string>();
  const folded = new Set<string>();

  for (const file of sorted) {
    assertRelPath(file.path);
    assertSha256(file.sha256, `${file.path} sha256`);
    if (file.mode !== "100644" && file.mode !== "100755") {
      throw new Error(`Unsupported file mode for ${file.path}`);
    }

    const key = file.path.toLowerCase();
    if (paths.has(file.path) || folded.has(key)) {
      throw new Error(`Duplicate or case-colliding path: ${file.path}`);
    }
    paths.add(file.path);
    folded.add(key);
  }

  return sorted;
}

export function treeHash(files: readonly TreeFile[]): string {
  return canonicalHash("tree", normalizeTreeFiles(files));
}

export function assertExactKeys(value: object, allowed: readonly string[], label: string): void {
  const expected = new Set(allowed);
  const actual = Reflect.ownKeys(value);
  if (actual.length !== expected.size || actual.some((key) => typeof key !== "string" || !expected.has(key))) {
    throw new Error(`${label} contains unknown or missing fields`);
  }
}

function encode(value: unknown, seen: Set<object>): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "string":
      assertUnicode(value);
      return JSON.stringify(value);
    case "boolean":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error("Canonical JSON rejects non-finite numbers");
      }
      return JSON.stringify(value);
    case "undefined":
    case "bigint":
    case "function":
    case "symbol":
      throw new Error(`Canonical JSON rejects ${typeof value}`);
    case "object":
      break;
  }

  if (seen.has(value)) {
    throw new Error("Canonical JSON rejects cyclic values");
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      const extra = Object.keys(value).filter((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length);
      if (extra.length) {
        throw new Error("Canonical JSON rejects non-index array properties");
      }

      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          throw new Error("Canonical JSON rejects sparse arrays");
        }
        items.push(encode(value[index], seen));
      }
      return `[${items.join(",")}]`;
    }

    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error("Canonical JSON accepts only plain objects");
    }
    if (Object.getOwnPropertySymbols(value).length) {
      throw new Error("Canonical JSON rejects symbol keys");
    }

    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort();
    keys.forEach(assertUnicode);
    return `{${keys.map((key) => `${JSON.stringify(key)}:${encode(object[key], seen)}`).join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

function assertUnicode(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) {
        throw new Error("Canonical JSON rejects lone Unicode surrogates");
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new Error("Canonical JSON rejects lone Unicode surrogates");
    }
  }
}
