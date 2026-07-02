import type { TimelineEvent } from "./types";
import { timing, framesForChars, framesForLines } from "./timing";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function rawDuration(e: TimelineEvent): number {
  switch (e.kind) {
    case "user":
      return clamp(framesForChars(e.text.length), timing.userMinFrames, timing.userMaxFrames);
    case "assistant":
      return clamp(
        framesForLines(e.text.split("\n").length),
        timing.eventMinFrames,
        timing.eventMaxFrames,
      );
    case "thinking":
      return timing.eventMinFrames;
    case "tool_call":
      return clamp(framesForLines(2), timing.eventMinFrames, timing.eventMaxFrames);
    case "tool_result":
      return clamp(
        framesForLines(e.lines.length + (e.hiddenCount > 0 ? 1 : 0)),
        timing.eventMinFrames,
        timing.eventMaxFrames,
      );
    case "context":
      return clamp(
        framesForLines(e.lines.length + (e.hiddenCount > 0 ? 1 : 0)),
        timing.eventMinFrames,
        timing.eventMaxFrames,
      );
  }
}

export function computeDurations(events: TimelineEvent[]): TimelineEvent[] {
  let cursor = 0;
  return events.map((e) => {
    const durationInFrames = rawDuration(e);
    const startFrame = cursor;
    cursor += durationInFrames;
    return { ...e, startFrame, durationInFrames };
  });
}
