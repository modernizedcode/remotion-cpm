import { describe, it, expect } from "vitest";
import { buildTimeline } from "./buildTimeline";
import type { ContentBlock } from "./types";

describe("buildTimeline", () => {
  it("maps each block kind and preserves order", () => {
    const blocks: ContentBlock[] = [
      { type: "text", text: "hello" }, // ambiguous role -> see next test; here treat as user
      { type: "thinking", thinking: "" },
      { type: "tool_use", id: "t1", name: "Bash", input: { command: "ls" } },
      { type: "tool_result", tool_use_id: "t1", content: "file.txt" },
    ];
    const events = buildTimeline(blocks);
    expect(events.map((e) => e.kind)).toEqual(["user", "thinking", "tool_call", "tool_result"]);
  });

  it("normalizes array tool_result content and truncates", () => {
    const long = Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n");
    const blocks: ContentBlock[] = [
      { type: "tool_result", tool_use_id: "t1", content: [{ type: "text", text: long }] },
    ];
    const ev = buildTimeline(blocks)[0];
    if (ev.kind !== "tool_result") throw new Error("expected tool_result");
    expect(ev.lines).toHaveLength(8);
    expect(ev.hiddenCount).toBe(12);
  });

  it("flags error results", () => {
    const blocks: ContentBlock[] = [
      { type: "tool_result", tool_use_id: "t1", content: "boom", is_error: true },
    ];
    const ev = buildTimeline(blocks)[0];
    if (ev.kind !== "tool_result") throw new Error("expected tool_result");
    expect(ev.isError).toBe(true);
  });

  it("maps an assistant-role text block to an assistant event", () => {
    const events = buildTimeline([{ type: "text", text: "hi", role: "assistant" }]);
    expect(events[0].kind).toBe("assistant");
  });

  it("maps skill-injection text to a context event, not a user prompt", () => {
    const long = "Base directory for this skill: X\n" + Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n");
    const events = buildTimeline([{ type: "text", text: long, role: "user" }]);
    expect(events[0].kind).toBe("context");
    if (events[0].kind !== "context") throw new Error("expected context");
    expect(events[0].hiddenCount).toBeGreaterThan(0);
  });

  it("keeps a normal user text as a user event", () => {
    const events = buildTimeline([{ type: "text", text: "find all the repos", role: "user" }]);
    expect(events[0].kind).toBe("user");
  });
});
