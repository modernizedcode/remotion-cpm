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
