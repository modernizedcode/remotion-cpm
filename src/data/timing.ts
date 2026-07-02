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
