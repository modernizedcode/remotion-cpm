import { timing } from "./timing";

export function truncate(
  text: string,
  maxLines: number = timing.maxResultLines,
): { lines: string[]; hiddenCount: number } {
  const all = text.split("\n");
  if (all.length <= maxLines) return { lines: all, hiddenCount: 0 };
  return { lines: all.slice(0, maxLines), hiddenCount: all.length - maxLines };
}
