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
    const role = entry.type === "assistant" ? "assistant" : "user";
    if (typeof content === "string") {
      blocks.push({ type: "text", text: content, role });
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text") blocks.push({ ...block, role });
        else blocks.push(block);
      }
    }
  }
  return blocks;
}
