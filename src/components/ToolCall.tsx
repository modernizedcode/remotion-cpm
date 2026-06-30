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
