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
