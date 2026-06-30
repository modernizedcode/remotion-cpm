import { describe, it, expect } from "vitest";
import { truncate } from "./truncate";

describe("truncate", () => {
  it("returns all lines when under the cap", () => {
    expect(truncate("a\nb\nc", 8)).toEqual({ lines: ["a", "b", "c"], hiddenCount: 0 });
  });

  it("caps lines and reports the hidden count", () => {
    const text = Array.from({ length: 20 }, (_, i) => `line${i}`).join("\n");
    const out = truncate(text, 8);
    expect(out.lines).toHaveLength(8);
    expect(out.lines[0]).toBe("line0");
    expect(out.hiddenCount).toBe(12);
  });

  it("treats empty string as a single empty line, nothing hidden", () => {
    expect(truncate("", 8)).toEqual({ lines: [""], hiddenCount: 0 });
  });
});
