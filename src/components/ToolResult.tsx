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
