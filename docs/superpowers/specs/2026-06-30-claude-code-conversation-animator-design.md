# Claude Code Conversation Animator — Design

**Date:** 2026-06-30
**Status:** Approved (pending spec review)

## Goal

Render a Claude Code session transcript (`e2f6752b-555b-4db9-ab95-752506132736.jsonl`)
into a video that animates the **entire** conversation, themed **Solarized Dark**.

The source session is a real Claude Code run about migrating `.NET` repositories to
Central Package Management — it is tool-heavy (Bash, Edit, Agent, TodoWrite, etc.),
with extended-thinking blocks and back-and-forth dialogue.

## Output

- **Platform:** [Remotion](https://remotion.dev) (React + TypeScript) → rendered **MP4**.
- **Dimensions:** 1920×1080 (16:9 landscape), **30fps**.
- **Theme:** Solarized Dark.
- **Audio:** none.
- **Framing:** stylized terminal **window chrome** (title bar + traffic-light dots,
  rounded dark frame). No title/intro card, no progress bar.

## Content & pacing

Render **everything**, in original per-turn order:

- User text
- Assistant text
- Thinking blocks (65)
- Tool calls (145) — tool name + input
- Tool results (145) — full output

**No truncation. Every byte appears on screen.** Long tool results scroll fully into
view; the duration model guarantees content is on screen long enough to have appeared
(nothing flashes past faster than it renders).

**Pacing:** fast-paced. Quick line/block reveals (opacity + slight translateY spring),
short holds — *not* character-by-character typewriter (reads as janky at speed).
Total video length is whatever the data requires.

## Architecture

Two cleanly separated layers:

```
scripts/build-conversation.ts   reads .jsonl → parse + normalize + compute timing
        │                       → writes src/data/conversation.json (typed)
        ▼
src/data/   (pure, unit-tested) parser · normalizer · duration calculator · types
        │
        ▼
src/        (Remotion / React)  Composition reads conversation.json, renders timeline
```

- **Data layer is pure and unit-tested** (Vitest, TDD).
- **Render layer is verified by eye** (Remotion Studio preview).
- Regenerate the dataset with `npm run build:data`. Durations are baked into the JSON,
  so the composition's total length is known at build time.

### Data layer (`src/data/`)

**Types** — discriminated union `TimelineEvent`:
`UserText | AssistantText | Thinking | ToolCall | ToolResult`. Each event carries its
display content plus computed `durationInFrames` and `startFrame`.

**`parseTranscript(raw: string)`** — split jsonl lines, keep `user`/`assistant`
entries, flatten each turn's content blocks **in original order** (so a turn becomes
e.g. thinking → text → tool_use → … faithfully). Drop harness-only entry types
(`queue-operation`, `pr-link`, `attachment`, `file-history-snapshot`, `last-prompt`,
`ai-title`).

**`buildTimeline(entries)`** — map raw blocks to typed events; pair each `tool_use`
with its matching `tool_result` by `tool_use_id`.

**`computeDurations(events)`** — fast-paced model: a small base hold per event plus
time proportional to content length, clamped to sane min/max. Long outputs get enough
frames to scroll fully into view (so "every byte on screen" actually holds), while
short events stay snappy.

These four functions are the unit-test surface.

### Render layer (`src/`)

- **`Root.tsx`** — single `<Composition>`; `calculateMetadata` sums `durationInFrames`
  from `conversation.json` to set total duration.
- **`TerminalWindow`** — window chrome: title bar, traffic-light dots, rounded dark
  frame, Solarized Dark background, monospace font.
- **Per-event components** — `UserMessage`, `AssistantMessage`, `ThinkingBlock`
  (dimmed/italic), `ToolCall` (tool name + input; e.g. `$ ` line for Bash, file path
  for Edit), `ToolResult` (boxed output). Each enters with a subtle reveal.
- **Auto-scroll transcript** — events stack vertically inside the window; the stack
  translates upward over time to keep the active event in view (live-terminal feel).
- **`theme.ts`** — Solarized Dark palette mapped to roles (user, assistant, thinking,
  tool, result) + accents.

## Tooling

- **TypeScript**, strict.
- **npm** package manager.
- **ESLint + Prettier**.
- Windows-friendly setup.

## Testing

- **Vitest** unit tests on `src/data/*`, written **TDD-first**.
- Swap-and-break assertions, e.g.:
  - unpaired `tool_use` (no matching result) handled gracefully
  - content blocks preserved in original order within a turn
  - harness-only entry types excluded from the timeline
  - duration scales with content length and respects min/max clamps
- No render/snapshot tests — the visual output is verified by watching the preview.

## Out of scope

- Multiple transcripts / generic CLI over arbitrary files (built around this one
  session; data path is configurable but multi-file batching is not a goal).
- Audio, narration, captions.
- Title/intro/outro cards, progress indicators.
- Pixel-faithful recreation of the real Claude Code TUI (stylized take instead).
