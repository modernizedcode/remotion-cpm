// Raw transcript shapes (only the fields we consume).
export interface RawEntry {
  type: string; // "user" | "assistant" | harness types
  message?: { role?: string; content?: string | ContentBlock[] };
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string; signature?: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string | Array<{ type: string; text?: string }>;
      is_error?: boolean;
    };

// Timeline events (output of the data layer).
interface Timed {
  startFrame: number;
  durationInFrames: number;
}

export type TimelineEvent =
  | ({ kind: "user"; text: string } & Timed)
  | ({ kind: "assistant"; text: string } & Timed)
  | ({ kind: "thinking" } & Timed)
  | ({ kind: "tool_call"; id: string; name: string; input: Record<string, unknown> } & Timed)
  | ({
      kind: "tool_result";
      toolUseId: string;
      lines: string[]; // visible lines after truncation
      hiddenCount: number; // 0 when nothing truncated
      isError: boolean;
    } & Timed);
