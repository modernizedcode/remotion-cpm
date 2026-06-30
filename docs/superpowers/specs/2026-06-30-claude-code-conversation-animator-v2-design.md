# Claude Code Conversation Animator (v2) — Design

**Date:** 2026-06-30
**Status:** Approved (pending spec review)
**Supersedes:** `2026-06-30-claude-code-conversation-animator-design.md` (v1)

## Goal

Render a real Claude Code session transcript
(`e2f6752b-555b-4db9-ab95-752506132736.jsonl` plus its 39 subagent transcripts in
the folder of the same name) into a **pixel-faithful Claude Code TUI** video, for use
as **YouTube b-roll**. The session is a tool-heavy run migrating multiple `.NET`
repositories to Central Package Management (CPM).

The video must read as an authentic recording of Claude Code in use, including the
user prompt being **typed in** live.

## Output

- **Platform:** [Remotion](https://remotion.dev) (React + TypeScript) → MP4.
- **Dimensions:** 3840×2160 (4K UHD, 16:9), **30fps**.
- **Theme:** Solarized Dark **background** (`#002b36`), with Claude Code's normal
  role accent colors on top.
- **Font:** JetBrains Mono (via Remotion Google Fonts).
- **Framing:** full-bleed terminal — content fills the frame, no window chrome, no
  title/intro/outro cards, no progress bar.
- **Audio:** none.

## Fidelity & behavior

Pixel-faithful to the real Claude Code TUI:

- **User prompts** render inside the box-drawing input frame with a `> ` caret and
  animate **character-by-character** with a blinking caret (the "typed in" requirement).
- **Assistant text, thinking, tool calls, tool results** appear with fast reveals
  (fade / quick stream-in) — *not* per-character typing. Thinking and the
  apply/tool-execution process are sped through.
- **Tool calls** render as the real TUI does: `⏺ Bash(…)`, `⏺ Edit(path)`,
  `⏺ Task(description)`, etc., with the input line beneath.
- **Tool results** render indented under `⎿` with **faithful truncation**: show the
  first few lines, then a dimmed collapse indicator (`… +N lines`), exactly like the
  real TUI. No full-output scrolling.
- **Subagents** (39 `Task` spawns) are shown **like the real TUI**: the `Task(…)`
  call and its final returned result inline; the subagent's internal steps stay
  collapsed (not expanded/nested).
- **Scroll:** real-terminal behavior — events stack vertically and the view
  translates upward to keep the newest output at the bottom.

## Coverage & pacing

Render the **full** session in original per-turn order — nothing curated away — but
paced **fast**: quick reveals and short holds so the whole session fits a tight
runtime. Because long outputs are truncated to their displayed form, total length is
driven by *displayed* content, not raw bytes.

## Architecture (build-time data pipeline)

```
scripts/build-data.ts   reads main .jsonl + subagents/*.jsonl
        │               → parse → normalize → pair tools → compute timing
        ▼
src/data/   (pure, TDD'd)  types · parseTranscript · buildTimeline · computeDurations
        │               → writes src/data/conversation.json (typed, frames baked in)
        ▼
src/        (Remotion)  Composition reads JSON; calculateMetadata sums frames
```

- The **data layer is pure and unit-tested** (Vitest, TDD-first).
- The **render layer is verified by eye** (Remotion Studio preview).
- `npm run build:data` regenerates `conversation.json`. Durations are baked into the
  JSON, so total composition length is known at build time.

### Data layer (`src/data/`)

**Types** — discriminated union
`TimelineEvent = UserText | AssistantText | Thinking | ToolCall | ToolResult`.
Each event carries its display content plus computed `startFrame` and
`durationInFrames`. `ToolCall` flags `isSubagent` and links its returned result.

**`parseTranscript(raw: string)`** — split jsonl lines, keep `user`/`assistant`
entries, flatten each turn's content blocks in original order (so a turn becomes
e.g. thinking → text → tool_use → … faithfully). Drop harness-only entry types
(`queue-operation`, `attachment`, `file-history-snapshot`, `pr-link`, `last-prompt`,
`ai-title`, etc.).

**`buildTimeline(entries)`** — map raw blocks to typed events; pair each `tool_use`
with its matching `tool_result` by `tool_use_id`. Subagent internals stay collapsed
(only the `Task` call and its final result become events).

**`computeDurations(events)`** — fast-paced model:
- User prompts: frames proportional to character count (typing speed), plus a short
  caret hold.
- Assistant / thinking / tool events: a small base hold plus time proportional to
  *displayed* (truncated) content length, clamped to sane min/max.

These four functions are the unit-test surface.

### Render layer (`src/`)

- **`Root.tsx`** — single `<Composition>`; `calculateMetadata` reads
  `conversation.json` and sums `durationInFrames` for total duration.
- **`Terminal.tsx`** — full-bleed Solarized-Dark background, JetBrains Mono,
  real-terminal upward scroll keeping the newest output at the bottom.
- **Per-event components:**
  - `UserPrompt` — box-drawing input frame, `> ` caret, char-by-char typing +
    blinking caret.
  - `AssistantText` — fast fade/stream-in.
  - `Thinking` — dimmed/italic, sped through.
  - `ToolCall` — `⏺ Tool(input)` bullet + input line (Bash, Edit, Task, etc.).
  - `ToolResult` — indented `⎿` output with faithful truncation (`… +N lines`).
  - `TodoWrite` — checkbox list rendering.
- **`theme.ts`** — Solarized-Dark background mapped with Claude Code's normal role
  accents (user, assistant, thinking, tool, result).

## Testing

- **Vitest** unit tests on `src/data/*`, written **TDD-first**.
- Swap-and-break assertions, e.g.:
  - harness-only entry types excluded from the timeline
  - content blocks preserved in original order within a turn
  - unpaired `tool_use` (no matching result) handled gracefully
  - subagent internals collapsed (only Task call + final result emitted)
  - duration scales with *displayed* content length and respects min/max clamps
  - typed-prompt duration scales with character count
- No render/snapshot tests — visual output is verified by watching the preview.

## Tooling & conventions

- **TypeScript**, strict.
- **npm** package manager.
- **ESLint + Prettier**.
- Windows-friendly setup.

## Out of scope

- Audio, narration, captions.
- Title/intro/outro cards, progress indicators, window chrome.
- Expanding subagent internals (kept collapsed like the real TUI).
- Full-byte scrolling of long tool output (truncated instead).
- Multi-transcript CLI over arbitrary files (built around this one session; the data
  path is configurable but multi-file batching is not a goal).
- Pixel-exact recreation of every Claude Code color (Solarized background is the
  deliberate divergence).
