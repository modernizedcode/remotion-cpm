import type { ContentBlock, TimelineEvent } from "./types";
import { truncate } from "./truncate";

function resultText(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === "string") return content;
  return content
    .map((p) => (p.type === "text" ? (p.text ?? "") : ""))
    .join("\n");
}

export function buildTimeline(blocks: ContentBlock[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const block of blocks) {
    if (block.type === "text") {
      if (block.text.startsWith("Base directory for this skill:")) {
        const { lines, hiddenCount } = truncate(block.text);
        events.push({ kind: "context", lines, hiddenCount, startFrame: 0, durationInFrames: 0 });
      } else {
        const kind = block.role === "assistant" ? "assistant" : "user";
        events.push({ kind, text: block.text, startFrame: 0, durationInFrames: 0 });
      }
    } else if (block.type === "thinking") {
      events.push({ kind: "thinking", startFrame: 0, durationInFrames: 0 });
    } else if (block.type === "tool_use") {
      events.push({
        kind: "tool_call",
        id: block.id,
        name: block.name,
        input: block.input,
        startFrame: 0,
        durationInFrames: 0,
      });
    } else if (block.type === "tool_result") {
      const { lines, hiddenCount } = truncate(resultText(block.content));
      events.push({
        kind: "tool_result",
        toolUseId: block.tool_use_id,
        lines,
        hiddenCount,
        isError: block.is_error === true,
        startFrame: 0,
        durationInFrames: 0,
      });
    }
  }
  return events;
}
