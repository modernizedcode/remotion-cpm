import type { RawEntry, ContentBlock } from "./types";

const KEEP = new Set(["user", "assistant"]);

export function parseTranscript(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: RawEntry;
    try {
      entry = JSON.parse(trimmed) as RawEntry;
    } catch {
      continue;
    }
    if (!KEEP.has(entry.type)) continue;
    const content = entry.message?.content;
    if (typeof content === "string") {
      blocks.push({ type: "text", text: content });
    } else if (Array.isArray(content)) {
      blocks.push(...content);
    }
  }
  return blocks;
}
