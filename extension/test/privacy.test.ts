import { describe, expect, it } from "vitest";
import { safeFileLabel } from "../src/privacy";

describe("editor path privacy", () => {
  it("keeps workspace-relative paths", () => {
    expect(safeFileLabel("D:\\work\\src\\cache.ts", "src\\cache.ts")).toBe("src/cache.ts");
  });

  it("reduces files outside the workspace to a basename", () => {
    expect(safeFileLabel("C:\\Users\\goose\\private\\notes.ts")).toBe("notes.ts");
  });

  it("rejects absolute or escaping labels", () => {
    expect(safeFileLabel("C:\\private\\notes.ts", "C:\\private\\notes.ts")).toBe("notes.ts");
    expect(safeFileLabel("C:\\private\\notes.ts", "..\\private\\notes.ts")).toBe("notes.ts");
  });
});
