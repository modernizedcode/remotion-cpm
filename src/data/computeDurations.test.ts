import { describe, it, expect } from "vitest";
import { computeDurations } from "./computeDurations";
import { timing } from "./timing";
import type { TimelineEvent } from "./types";

const ev = (e: Partial<TimelineEvent> & { kind: TimelineEvent["kind"] }): TimelineEvent =>
  ({ startFrame: 0, durationInFrames: 0, ...e }) as TimelineEvent;

describe("computeDurations", () => {
  it("sets startFrame as the cumulative sum of durations", () => {
    const out = computeDurations([
      ev({ kind: "thinking" }),
      ev({ kind: "thinking" }),
    ]);
    expect(out[0].startFrame).toBe(0);
    expect(out[1].startFrame).toBe(out[0].durationInFrames);
  });

  it("scales user-prompt duration with character count", () => {
    const short = computeDurations([ev({ kind: "user", text: "hi" })])[0];
    const long = computeDurations([ev({ kind: "user", text: "x".repeat(100) })])[0];
    expect(long.durationInFrames).toBeGreaterThan(short.durationInFrames);
  });

  it("clamps user duration to the max", () => {
    const huge = computeDurations([ev({ kind: "user", text: "x".repeat(100000) })])[0];
    expect(huge.durationInFrames).toBe(timing.userMaxFrames);
  });

  it("gives thinking the fixed minimum", () => {
    const t = computeDurations([ev({ kind: "thinking" })])[0];
    expect(t.durationInFrames).toBe(timing.eventMinFrames);
  });

  it("accumulates startFrame across three events (running sum, not just previous)", () => {
    const out = computeDurations([ev({ kind: "thinking" }), ev({ kind: "thinking" }), ev({ kind: "thinking" })]);
    expect(out[2].startFrame).toBe(out[0].durationInFrames + out[1].durationInFrames);
  });

  it("gives a tool_result with hidden lines a longer duration than one without", () => {
    const few = computeDurations([ev({ kind: "tool_result", toolUseId: "a", lines: ["x"], hiddenCount: 0, isError: false })])[0];
    const hidden = computeDurations([ev({ kind: "tool_result", toolUseId: "b", lines: ["x"], hiddenCount: 50, isError: false })])[0];
    expect(hidden.durationInFrames).toBeGreaterThanOrEqual(few.durationInFrames);
  });

  it("assigns positive clamped durations to assistant and tool_call events", () => {
    const a = computeDurations([ev({ kind: "assistant", text: "one\ntwo" })])[0];
    const t = computeDurations([ev({ kind: "tool_call", id: "x", name: "Bash", input: {} })])[0];
    expect(a.durationInFrames).toBeGreaterThan(0);
    expect(t.durationInFrames).toBeGreaterThan(0);
  });
});
