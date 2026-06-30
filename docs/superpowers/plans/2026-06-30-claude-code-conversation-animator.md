# Claude Code Conversation Animator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the real Claude Code CPM-migration transcript into a pixel-faithful, 4K, Solarized-Dark-background Claude Code TUI video (MP4) for YouTube b-roll.

**Architecture:** Build-time data pipeline. A pure, unit-tested data layer (`src/data/`) parses the `.jsonl` transcript, builds a typed timeline, pairs tool calls with results, applies faithful truncation, and computes per-event frame durations. A build script bakes this into `src/data/conversation.json`. A Remotion render layer reads that JSON and animates it; `calculateMetadata` sums frame durations for total length.

**Tech Stack:** Remotion (React + TypeScript), Vitest, ESLint + Prettier, npm, Node ≥ 18. Font: JetBrains Mono via `@remotion/google-fonts`.

## Global Constraints

- **Resolution / fps:** 3840×2160, 30fps. Verbatim.
- **Theme:** Solarized-Dark background `#002b36`; Claude Code's normal role accent colors on top.
- **Font:** JetBrains Mono only.
- **Framing:** full-bleed terminal — no window chrome, no intro/outro/title cards, no progress bar, no audio.
- **TypeScript strict mode** (`"strict": true`).
- **TDD-first on `src/data/*` only.** Render layer (`src/*.tsx`, `src/components/*`) is verified by eye in Remotion Studio — no snapshot/render tests.
- **Source transcript:** `e2f6752b-555b-4db9-ab95-752506132736.jsonl` at repo root. Do **not** read the `subagents/` folder — subagent activity is already collapsed into the main transcript (`Agent` tool call + its result).
- **All thinking blocks are empty** (redacted) — render a generic indicator, never expect thinking text.
- Single source of timing constants (`src/data/timing.ts`) shared by both the duration calculator and the render components so typing animation completes exactly within its event's duration.

---

## Transcript data shapes (reference — verified against the real file)

Each jsonl line is one JSON object with a `type` field.

- **Keep:** `type: "user"` and `type: "assistant"`.
- **Drop (harness-only):** `queue-operation`, `attachment`, `file-history-snapshot`, `last-prompt`, `ai-title`, `pr-link`, and any unrecognized type.

`entry.message.content` is either a `string` or an array of blocks.

**Assistant blocks:**
- `{ type: "thinking", thinking: string, signature: string }` — `thinking` is always `""` here.
- `{ type: "text", text: string }`
- `{ type: "tool_use", id: string, name: string, input: object, caller: {...} }`

**User blocks** (array form) are one of:
- `{ type: "text", text: string }` — a typed user prompt (11 of these).
- `{ type: "tool_result", tool_use_id: string, content: string | Array<{type:"text",text:string}>, is_error?: boolean }` — 145 of these.

Tool `name` values present: `Skill`, `ToolSearch`, `TodoWrite`, `Bash`, `AskUserQuestion`, `Write`, `Read`, `Agent`, `Edit`.

---

## File structure

- `package.json`, `tsconfig.json`, `remotion.config.ts`, `.eslintrc.cjs`, `.prettierrc`, `vitest.config.ts` — scaffolding (Task 1).
- `src/data/types.ts` — raw transcript types + `TimelineEvent` union (Task 2).
- `src/data/timing.ts` — shared timing constants + helpers (Task 2).
- `src/data/parseTranscript.ts` (+ `.test.ts`) — jsonl → flattened ordered raw blocks (Task 3).
- `src/data/truncate.ts` (+ `.test.ts`) — faithful truncation helper (Task 4).
- `src/data/buildTimeline.ts` (+ `.test.ts`) — raw blocks → typed events, tool pairing (Task 5).
- `src/data/computeDurations.ts` (+ `.test.ts`) — assign `startFrame`/`durationInFrames` (Task 6).
- `scripts/build-data.ts` — orchestrates the above, writes `conversation.json` (Task 7).
- `src/data/conversation.json` — generated dataset (Task 7, git-ignored output of build).
- `src/theme.ts` — Solarized bg + role accents (Task 8).
- `src/Terminal.tsx` — full-bleed shell + auto-scroll (Task 9).
- `src/components/{UserPrompt,AssistantText,Thinking,ToolCall,ToolResult,TodoList}.tsx` — per-event renderers (Tasks 10–11).
- `src/Root.tsx` — `<Composition>` + `calculateMetadata` (Task 12).

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `remotion.config.ts`, `vitest.config.ts`, `.eslintrc.cjs`, `.prettierrc`, `src/index.ts`

**Interfaces:**
- Produces: a buildable Remotion + Vitest project. `npm test`, `npm run dev`, `npx remotion render` all runnable.

- [ ] **Step 1: Initialize package.json**

```bash
cd c:/Code/bhirani/remotion-cpm
npm init -y
npm i react react-dom remotion @remotion/cli @remotion/google-fonts
npm i -D typescript @types/react @types/react-dom vitest tsx eslint prettier
```

- [ ] **Step 2: Add scripts to package.json**

Edit `package.json` `"scripts"` to:

```json
{
  "scripts": {
    "dev": "remotion studio",
    "build:data": "tsx scripts/build-data.ts",
    "render": "remotion render Conversation out/conversation.mp4",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src scripts --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\" \"scripts/**/*.ts\""
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "scripts"]
}
```

- [ ] **Step 4: Create remotion.config.ts**

```ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setEntryPoint("./src/index.ts");
```

- [ ] **Step 5: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { globals: true, environment: "node" },
});
```

- [ ] **Step 6: Create src/index.ts (Remotion entry)**

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

- [ ] **Step 7: Create minimal src/Root.tsx placeholder so the entry compiles**

```tsx
import { Composition } from "remotion";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Conversation"
      component={() => null}
      durationInFrames={30}
      fps={30}
      width={3840}
      height={2160}
    />
  );
};
```

- [ ] **Step 8: Create .prettierrc and .eslintrc.cjs**

`.prettierrc`:
```json
{ "semi": true, "singleQuote": false, "trailingComma": "all" }
```

`.eslintrc.cjs`:
```js
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2020, sourceType: "module" },
  env: { node: true, browser: true },
  extends: ["eslint:recommended"],
  ignorePatterns: ["node_modules", "out", ".remotion", "src/data/conversation.json"],
};
```

- [ ] **Step 9: Verify the project builds**

Run: `npm test`
Expected: Vitest reports "No test files found" (exit 0, no error). 

Run: `npx remotion compositions`
Expected: lists composition `Conversation` with no compile error.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json remotion.config.ts vitest.config.ts .eslintrc.cjs .prettierrc src/index.ts src/Root.tsx
git commit -m "chore: scaffold Remotion + Vitest project"
```

---

## Task 2: Types and timing constants

**Files:**
- Create: `src/data/types.ts`, `src/data/timing.ts`

**Interfaces:**
- Produces:
  - `RawEntry`, `ContentBlock` raw types.
  - `TimelineEvent` discriminated union (`kind`: `"user" | "assistant" | "thinking" | "tool_call" | "tool_result"`), each with `startFrame: number` and `durationInFrames: number`.
  - `timing` constants object + `framesForChars(n)` / `framesForLines(n)` helpers.

- [ ] **Step 1: Create src/data/types.ts**

```ts
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
```

- [ ] **Step 2: Create src/data/timing.ts**

```ts
export const FPS = 30;

export const timing = {
  // User prompt char-by-char typing.
  framesPerChar: 0.7,
  caretHoldFrames: 18, // hold after typing finishes
  userMinFrames: 24,
  userMaxFrames: 180,

  // Non-typed events: base hold + content-scaled time.
  baseFrames: 14,
  framesPerResultLine: 4,
  eventMinFrames: 14,
  eventMaxFrames: 150,

  // Faithful truncation: lines shown before collapse.
  maxResultLines: 8,
} as const;

export const framesForChars = (n: number): number =>
  Math.round(n * timing.framesPerChar) + timing.caretHoldFrames;

export const framesForLines = (n: number): number =>
  timing.baseFrames + n * timing.framesPerResultLine;
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/types.ts src/data/timing.ts
git commit -m "feat: add data-layer types and timing constants"
```

---

## Task 3: parseTranscript

**Files:**
- Create: `src/data/parseTranscript.ts`, `src/data/parseTranscript.test.ts`

**Interfaces:**
- Consumes: `RawEntry`, `ContentBlock` from `types.ts`.
- Produces: `parseTranscript(raw: string): ContentBlock[]` — flattens kept entries' content into a single ordered block list. String content becomes a single `text` block. Harness entry types are dropped. Malformed lines are skipped.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/parseTranscript.test.ts`
Expected: FAIL — "Cannot find module './parseTranscript'".

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/parseTranscript.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/parseTranscript.ts src/data/parseTranscript.test.ts
git commit -m "feat: parse transcript jsonl into ordered content blocks"
```

---

## Task 4: truncate helper

**Files:**
- Create: `src/data/truncate.ts`, `src/data/truncate.test.ts`

**Interfaces:**
- Consumes: `timing.maxResultLines` from `timing.ts`.
- Produces: `truncate(text: string, maxLines?: number): { lines: string[]; hiddenCount: number }` — splits on `\n`, keeps the first `maxLines`, reports how many were hidden.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { truncate } from "./truncate";

describe("truncate", () => {
  it("returns all lines when under the cap", () => {
    expect(truncate("a\nb\nc", 8)).toEqual({ lines: ["a", "b", "c"], hiddenCount: 0 });
  });

  it("caps lines and reports the hidden count", () => {
    const text = Array.from({ length: 20 }, (_, i) => `line${i}`).join("\n");
    const out = truncate(text, 8);
    expect(out.lines).toHaveLength(8);
    expect(out.lines[0]).toBe("line0");
    expect(out.hiddenCount).toBe(12);
  });

  it("treats empty string as a single empty line, nothing hidden", () => {
    expect(truncate("", 8)).toEqual({ lines: [""], hiddenCount: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/truncate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { timing } from "./timing";

export function truncate(
  text: string,
  maxLines: number = timing.maxResultLines,
): { lines: string[]; hiddenCount: number } {
  const all = text.split("\n");
  if (all.length <= maxLines) return { lines: all, hiddenCount: 0 };
  return { lines: all.slice(0, maxLines), hiddenCount: all.length - maxLines };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/truncate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/truncate.ts src/data/truncate.test.ts
git commit -m "feat: add faithful tool-output truncation helper"
```

---

## Task 5: buildTimeline

**Files:**
- Create: `src/data/buildTimeline.ts`, `src/data/buildTimeline.test.ts`

**Interfaces:**
- Consumes: `ContentBlock`, `TimelineEvent` from `types.ts`; `truncate` from `truncate.ts`.
- Produces: `buildTimeline(blocks: ContentBlock[]): TimelineEvent[]` — maps each block to a typed event with `startFrame: 0` and `durationInFrames: 0` (timing assigned later). `tool_result` content normalized to text then truncated. Order preserved. Unpaired tool calls/results are each still emitted independently (no merging required — they appear in order).

Helper for normalizing result content:
- `resultText(content: string | Array<{type:string;text?:string}>): string` — joins array text parts with `\n`, or returns the string directly.

- [ ] **Step 1: Write the failing test**

```ts
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
});
```

Note on text role: a bare `text` block's role (user vs assistant) is not on the block. `buildTimeline` infers role from a `role` argument is overkill; instead the build script passes role via the entry. To keep `buildTimeline` pure and order-faithful, we carry role on the block during parsing. **Update `parseTranscript` (Task 3) is NOT changed**; instead `buildTimeline` accepts pre-tagged blocks. See Step 3 — we add an optional `role` field.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/buildTimeline.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

First extend `ContentBlock`'s text variant in `src/data/types.ts` to carry an optional role, and tag it in `parseTranscript`. Edit `types.ts` text variant:

```ts
  | { type: "text"; text: string; role?: "user" | "assistant" }
```

Edit `parseTranscript.ts` to tag text blocks with the entry role (replace the array branch):

```ts
    } else if (Array.isArray(content)) {
      const role = entry.type === "assistant" ? "assistant" : "user";
      for (const block of content) {
        if (block.type === "text") blocks.push({ ...block, role });
        else blocks.push(block);
      }
    } else if (typeof content === "string") {
      // string content only occurs on user prompts
    }
```

Also tag the string branch:

```ts
    if (typeof content === "string") {
      blocks.push({ type: "text", text: content, role: entry.type === "assistant" ? "assistant" : "user" });
    }
```

Then `buildTimeline.ts`:

```ts
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
      const kind = block.role === "assistant" ? "assistant" : "user";
      events.push({ kind, text: block.text, startFrame: 0, durationInFrames: 0 });
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/buildTimeline.test.ts src/data/parseTranscript.test.ts`
Expected: PASS (all). The first `buildTimeline` test's bare `text` block has no role, so it maps to `user` — matches the expectation.

- [ ] **Step 5: Commit**

```bash
git add src/data/buildTimeline.ts src/data/buildTimeline.test.ts src/data/types.ts src/data/parseTranscript.ts
git commit -m "feat: build typed timeline events from content blocks"
```

---

## Task 6: computeDurations

**Files:**
- Create: `src/data/computeDurations.ts`, `src/data/computeDurations.test.ts`

**Interfaces:**
- Consumes: `TimelineEvent` from `types.ts`; `timing`, `framesForChars`, `framesForLines` from `timing.ts`.
- Produces: `computeDurations(events: TimelineEvent[]): TimelineEvent[]` — returns new events with `durationInFrames` filled (clamped) and `startFrame` set to the running cumulative sum.

Duration rules:
- `user`: `clamp(framesForChars(text.length), userMin, userMax)`.
- `assistant`: `clamp(framesForLines(text.split("\n").length), eventMin, eventMax)`.
- `thinking`: `eventMinFrames` (fast, fixed).
- `tool_call`: `clamp(framesForLines(2), eventMin, eventMax)` (name + input line).
- `tool_result`: `clamp(framesForLines(lines.length + (hiddenCount > 0 ? 1 : 0)), eventMin, eventMax)`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/computeDurations.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/computeDurations.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full data-layer suite**

Run: `npm test`
Expected: PASS — all data-layer test files green.

- [ ] **Step 6: Commit**

```bash
git add src/data/computeDurations.ts src/data/computeDurations.test.ts
git commit -m "feat: compute per-event frame durations and start frames"
```

---

## Task 7: build-data script

**Files:**
- Create: `scripts/build-data.ts`
- Add to `.gitignore`: `src/data/conversation.json`

**Interfaces:**
- Consumes: `parseTranscript`, `buildTimeline`, `computeDurations`.
- Produces: `src/data/conversation.json` — `{ events: TimelineEvent[]; totalFrames: number }`.

- [ ] **Step 1: Write the script**

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseTranscript } from "../src/data/parseTranscript";
import { buildTimeline } from "../src/data/buildTimeline";
import { computeDurations } from "../src/data/computeDurations";

const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "e2f6752b-555b-4db9-ab95-752506132736.jsonl");
const OUT = resolve(ROOT, "src/data/conversation.json");

const raw = readFileSync(SOURCE, "utf-8");
const events = computeDurations(buildTimeline(parseTranscript(raw)));
const totalFrames = events.reduce((n, e) => n + e.durationInFrames, 0);

writeFileSync(OUT, JSON.stringify({ events, totalFrames }, null, 2));
console.log(`Wrote ${events.length} events, ${totalFrames} frames to ${OUT}`);
```

- [ ] **Step 2: Add the generated file to .gitignore**

Append to `.gitignore`:
```
src/data/conversation.json
```

- [ ] **Step 3: Run the build**

Run: `npm run build:data`
Expected: prints e.g. `Wrote 4XX events, NNNN frames` (events ≈ 11 user + assistant texts + 65 thinking + 145 tool_call + 145 tool_result). No error.

- [ ] **Step 4: Sanity-check the output**

Run: `node -e "const d=require('./src/data/conversation.json'); console.log(d.events.length, d.totalFrames, d.events.slice(0,3).map(e=>e.kind))"`
Expected: a positive event count, positive totalFrames, first kinds look plausible (e.g. `['user', ...]`).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data.ts .gitignore
git commit -m "feat: add build-data script generating conversation.json"
```

---

## Task 8: Theme

**Files:**
- Create: `src/theme.ts`

**Interfaces:**
- Produces: `theme` object — Solarized-Dark background + Claude Code role accents + font family string.

- [ ] **Step 1: Create src/theme.ts**

```ts
// Solarized Dark background with Claude Code's normal accent roles.
export const theme = {
  fontFamily: "'JetBrains Mono', monospace",
  bg: "#002b36", // solarized base03
  fg: "#eee8d5", // solarized base2 (primary text)
  dim: "#586e75", // solarized base01 (thinking / secondary)
  user: "#b58900", // amber prompt
  assistant: "#93a1a1",
  toolName: "#268bd2", // blue tool bullet
  toolInput: "#2aa198", // cyan
  result: "#839496",
  error: "#dc322f",
  caret: "#eee8d5",
} as const;
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/theme.ts
git commit -m "feat: add Solarized-Dark theme palette"
```

---

## Task 9: Terminal shell + auto-scroll

**Files:**
- Create: `src/Terminal.tsx`

**Interfaces:**
- Consumes: `theme`; `conversation.json`; the per-event components (Tasks 10–11) — import them but render a placeholder text node first, then wire components in Task 11.
- Produces: `Terminal` component that renders all events whose `startFrame <= currentFrame`, stacked, with the stack translated upward to keep the newest visible (real-terminal scroll).

- [ ] **Step 1: Load JetBrains Mono and create the shell**

```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/JetBrainsMono";
import { useRef, useEffect, useState } from "react";
import { theme } from "./theme";
import conversation from "./data/conversation.json";
import type { TimelineEvent } from "./data/types";
import { EventView } from "./components/EventView";

const { fontFamily } = loadFont();
const events = conversation.events as TimelineEvent[];

export const Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const visible = events.filter((e) => e.startFrame <= frame);

  // Real-terminal scroll: measure stack height; translate up so the bottom stays in view.
  const stackRef = useRef<HTMLDivElement>(null);
  const [stackHeight, setStackHeight] = useState(0);
  useEffect(() => {
    if (stackRef.current) setStackHeight(stackRef.current.scrollHeight);
  });
  const pad = 80;
  const usable = height - pad * 2;
  const translateY = Math.min(0, usable - stackHeight);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily, color: theme.fg, padding: pad }}>
      <div style={{ transform: `translateY(${translateY}px)` }}>
        <div ref={stackRef} style={{ fontSize: 34, lineHeight: 1.45 }}>
          {visible.map((e, i) => (
            <EventView key={i} event={e} frame={frame} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Create a temporary EventView stub so it compiles**

Create `src/components/EventView.tsx`:
```tsx
import type { TimelineEvent } from "../data/types";

export const EventView: React.FC<{ event: TimelineEvent; frame: number }> = ({ event }) => {
  return <div>{event.kind}</div>;
};
```

- [ ] **Step 3: Wire Terminal into Root and preview**

Replace `src/Root.tsx`:
```tsx
import { Composition } from "remotion";
import { Terminal } from "./Terminal";
import conversation from "./data/conversation.json";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Conversation"
      component={Terminal}
      durationInFrames={conversation.totalFrames}
      fps={30}
      width={3840}
      height={2160}
    />
  );
};
```

Run: `npm run dev`
Expected: Remotion Studio opens; scrubbing shows event-kind labels stacking and scrolling upward over time. **Verify by eye.**

- [ ] **Step 4: Commit**

```bash
git add src/Terminal.tsx src/components/EventView.tsx src/Root.tsx
git commit -m "feat: terminal shell with auto-scroll and event dispatch stub"
```

---

## Task 10: Reveal + typing components (user, assistant, thinking)

**Files:**
- Create: `src/components/UserPrompt.tsx`, `src/components/AssistantText.tsx`, `src/components/Thinking.tsx`

**Interfaces:**
- Consumes: `theme`; `timing` (for `framesPerChar`); each receives `{ event, frame }`.
- Produces: three components. `UserPrompt` types char-by-char within its duration using the same `framesPerChar` as the duration calc, with a blinking caret in a box-drawing input frame.

- [ ] **Step 1: UserPrompt with char-by-char typing + caret**

```tsx
import { interpolate } from "remotion";
import { theme } from "../theme";
import { timing } from "../data/timing";

export const UserPrompt: React.FC<{ text: string; startFrame: number; frame: number }> = ({
  text,
  startFrame,
  frame,
}) => {
  const elapsed = frame - startFrame;
  const shown = Math.max(0, Math.min(text.length, Math.floor(elapsed / timing.framesPerChar)));
  const typing = shown < text.length;
  const caretOn = Math.floor(frame / 15) % 2 === 0;
  return (
    <div
      style={{
        border: `2px solid ${theme.dim}`,
        borderRadius: 8,
        padding: "12px 18px",
        margin: "14px 0",
        color: theme.user,
        whiteSpace: "pre-wrap",
      }}
    >
      {"> "}
      {text.slice(0, shown)}
      {(typing || caretOn) && <span style={{ color: theme.caret }}>▋</span>}
    </div>
  );
};
```

- [ ] **Step 2: AssistantText (fast fade-in)**

```tsx
import { interpolate } from "remotion";
import { theme } from "../theme";

export const AssistantText: React.FC<{ text: string; startFrame: number; frame: number }> = ({
  text,
  startFrame,
  frame,
}) => {
  const opacity = interpolate(frame - startFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, color: theme.assistant, whiteSpace: "pre-wrap", margin: "10px 0" }}>
      {text}
    </div>
  );
};
```

- [ ] **Step 3: Thinking (dimmed italic indicator — content is always empty)**

```tsx
import { interpolate } from "remotion";
import { theme } from "../theme";

export const Thinking: React.FC<{ startFrame: number; frame: number }> = ({ startFrame, frame }) => {
  const opacity = interpolate(frame - startFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, color: theme.dim, fontStyle: "italic", margin: "6px 0" }}>
      ✻ Thinking…
    </div>
  );
};
```

- [ ] **Step 4: Preview each by wiring into EventView temporarily (full wiring is Task 11)**

For now just verify they compile:
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/UserPrompt.tsx src/components/AssistantText.tsx src/components/Thinking.tsx
git commit -m "feat: user-typing, assistant, and thinking event components"
```

---

## Task 11: Tool components + EventView dispatch

**Files:**
- Create: `src/components/ToolCall.tsx`, `src/components/ToolResult.tsx`, `src/components/TodoList.tsx`
- Modify: `src/components/EventView.tsx`

**Interfaces:**
- Consumes: `theme`; `TimelineEvent`; all event components.
- Produces: `EventView` dispatching on `event.kind`, plus tool renderers. `ToolCall` formats input per tool (Bash→command, Edit/Read/Write→file_path, Agent→description, else compact JSON). `TodoList` renders the TodoWrite todos as checkboxes. `ToolResult` shows visible lines + `… +N lines` when `hiddenCount > 0`.

- [ ] **Step 1: ToolCall (with per-tool input formatting)**

```tsx
import { interpolate } from "remotion";
import { theme } from "../theme";

function formatInput(name: string, input: Record<string, unknown>): string {
  if (name === "Bash") return String(input.command ?? "");
  if (name === "Edit" || name === "Read" || name === "Write")
    return String(input.file_path ?? input.path ?? "");
  if (name === "Agent") return String(input.description ?? "");
  if (name === "Skill") return String(input.skill ?? "");
  const json = JSON.stringify(input);
  return json.length > 120 ? json.slice(0, 117) + "…" : json;
}

export const ToolCall: React.FC<{
  name: string;
  input: Record<string, unknown>;
  startFrame: number;
  frame: number;
}> = ({ name, input, startFrame, frame }) => {
  const opacity = interpolate(frame - startFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, margin: "10px 0", whiteSpace: "pre-wrap" }}>
      <span style={{ color: theme.toolName }}>⏺ {name}</span>
      <span style={{ color: theme.toolInput }}>({formatInput(name, input)})</span>
    </div>
  );
};
```

- [ ] **Step 2: ToolResult (faithful truncation)**

```tsx
import { interpolate } from "remotion";
import { theme } from "../theme";

export const ToolResult: React.FC<{
  lines: string[];
  hiddenCount: number;
  isError: boolean;
  startFrame: number;
  frame: number;
}> = ({ lines, hiddenCount, isError, startFrame, frame }) => {
  const opacity = interpolate(frame - startFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const color = isError ? theme.error : theme.result;
  return (
    <div style={{ opacity, margin: "4px 0 12px 24px", color, whiteSpace: "pre-wrap" }}>
      {lines.map((l, i) => (
        <div key={i}>
          {i === 0 ? "⎿  " : "   "}
          {l}
        </div>
      ))}
      {hiddenCount > 0 && <div style={{ color: theme.dim }}>{`   … +${hiddenCount} lines`}</div>}
    </div>
  );
};
```

- [ ] **Step 3: TodoList (rendered when a tool_call is TodoWrite)**

```tsx
import { theme } from "../theme";

interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

const mark: Record<Todo["status"], string> = {
  completed: "✔",
  in_progress: "▸",
  pending: "☐",
};

export const TodoList: React.FC<{ todos: Todo[] }> = ({ todos }) => (
  <div style={{ margin: "6px 0 12px 24px" }}>
    {todos.map((t, i) => (
      <div key={i} style={{ color: t.status === "completed" ? theme.dim : theme.fg }}>
        {mark[t.status]} {t.content}
      </div>
    ))}
  </div>
);
```

- [ ] **Step 4: EventView dispatch**

Replace `src/components/EventView.tsx`:
```tsx
import type { TimelineEvent } from "../data/types";
import { UserPrompt } from "./UserPrompt";
import { AssistantText } from "./AssistantText";
import { Thinking } from "./Thinking";
import { ToolCall } from "./ToolCall";
import { ToolResult } from "./ToolResult";
import { TodoList } from "./TodoList";

export const EventView: React.FC<{ event: TimelineEvent; frame: number }> = ({ event, frame }) => {
  switch (event.kind) {
    case "user":
      return <UserPrompt text={event.text} startFrame={event.startFrame} frame={frame} />;
    case "assistant":
      return <AssistantText text={event.text} startFrame={event.startFrame} frame={frame} />;
    case "thinking":
      return <Thinking startFrame={event.startFrame} frame={frame} />;
    case "tool_call":
      if (event.name === "TodoWrite" && Array.isArray((event.input as { todos?: unknown }).todos)) {
        return <TodoList todos={(event.input as { todos: never[] }).todos} />;
      }
      return (
        <ToolCall name={event.name} input={event.input} startFrame={event.startFrame} frame={frame} />
      );
    case "tool_result":
      return (
        <ToolResult
          lines={event.lines}
          hiddenCount={event.hiddenCount}
          isError={event.isError}
          startFrame={event.startFrame}
          frame={frame}
        />
      );
  }
};
```

- [ ] **Step 5: Preview the full composition**

Run: `npm run dev`
Expected: scrubbing the timeline shows the real conversation — typed user prompt with caret, dimmed thinking, blue tool bullets with formatted inputs, indented results with `… +N lines`, todo checkboxes — scrolling like a terminal. **Verify by eye.** Adjust `theme`/`timing` constants if pacing or colors look off, then rerun `npm run build:data` if timing constants changed.

- [ ] **Step 6: Commit**

```bash
git add src/components/ToolCall.tsx src/components/ToolResult.tsx src/components/TodoList.tsx src/components/EventView.tsx
git commit -m "feat: tool-call, tool-result, todo components and event dispatch"
```

---

## Task 12: Render the final video

**Files:** none (uses existing scripts).

- [ ] **Step 1: Ensure data is fresh**

Run: `npm run build:data`
Expected: regenerates `conversation.json` with current timing constants.

- [ ] **Step 2: Render to MP4**

Run: `npm run render`
Expected: produces `out/conversation.mp4` at 3840×2160, 30fps, with no audio. (`out/` is git-ignored.)

- [ ] **Step 3: Spot-check the output**

Open `out/conversation.mp4`. Verify: full-bleed Solarized-Dark terminal, JetBrains Mono, user prompt typing in, fast thinking/tool flow, faithful truncation, terminal scroll. **Verify by eye.**

- [ ] **Step 4: Final lint + test gate**

Run: `npm run lint && npm test`
Expected: lint clean, all data-layer tests green.

- [ ] **Step 5: Commit any final constant tweaks**

```bash
git add -A
git commit -m "chore: finalize animator timing and theme"
```

---

## Self-Review

**Spec coverage check (each spec section → task):**
- Pixel-faithful TUI, full-bleed, Solarized bg, JetBrains Mono → Tasks 8–11.
- User prompts typed char-by-char with caret → Task 10 (`UserPrompt`), timing in Task 6/2.
- Assistant/thinking/tool fast reveals → Tasks 10–11.
- Faithful truncation (`… +N lines`) → Task 4 (`truncate`), Task 5 (build), Task 11 (`ToolResult`).
- Subagents like real TUI → automatic (main transcript already collapses them); `Agent` rendered as a normal tool call in Task 11. Noted in Global Constraints.
- Real-terminal scroll → Task 9.
- Full session, fast pacing → Task 6 durations + Task 7 baked totals.
- Build-time data pipeline, pure modules → Tasks 3–7.
- TDD on `src/data/*` → Tasks 3–6 (failing test first each).
- 4K/30fps, MP4, no audio → Tasks 9/12, composition config in Task 9/Root.
- TS strict, ESLint, Prettier, npm, Windows-friendly → Task 1.

**Placeholder scan:** No TBD/TODO; every code step has full code; commands have expected output.

**Type consistency:** `TimelineEvent` kinds (`user/assistant/thinking/tool_call/tool_result`) used identically across types.ts, buildTimeline, computeDurations, EventView. `framesPerChar` shared by computeDurations and UserPrompt via `timing.ts`. `truncate` returns `{lines, hiddenCount}` consumed by buildTimeline and surfaced on the `tool_result` event consumed by ToolResult. Consistent.
