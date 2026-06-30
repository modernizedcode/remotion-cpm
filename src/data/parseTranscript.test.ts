import { describe, it, expect } from "vitest";
import { parseTranscript } from "./parseTranscript";

const line = (o: unknown) => JSON.stringify(o);

describe("parseTranscript", () => {
  it("drops harness-only entry types", () => {
    const raw = [
      line({ type: "queue-operation" }),
      line({ type: "attachment" }),
      line({ type: "ai-title" }),
      line({ type: "user", message: { content: "hi" } }),
    ].join("\n");
    const blocks = parseTranscript(raw);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "text", text: "hi" });
  });

  it("preserves block order within an assistant turn", () => {
    const raw = line({
      type: "assistant",
      message: {
        content: [
          { type: "thinking", thinking: "" },
          { type: "text", text: "ok" },
          { type: "tool_use", id: "t1", name: "Bash", input: { command: "ls" } },
        ],
      },
    });
    const blocks = parseTranscript(raw);
    expect(blocks.map((b) => b.type)).toEqual(["thinking", "text", "tool_use"]);
  });

  it("skips malformed json lines", () => {
    const raw = ["not json", line({ type: "user", message: { content: "x" } })].join("\n");
    expect(parseTranscript(raw)).toHaveLength(1);
  });
});
