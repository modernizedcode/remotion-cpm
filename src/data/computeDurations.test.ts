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
});
