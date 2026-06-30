import { interpolate } from "remotion";
import { theme } from "../theme";

export const SystemBlock: React.FC<{
  lines: string[];
  hiddenCount: number;
  startFrame: number;
  frame: number;
}> = ({ lines, hiddenCount, startFrame, frame }) => {
  const opacity = interpolate(frame - startFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, color: theme.dim, fontStyle: "italic", margin: "8px 0", whiteSpace: "pre-wrap" }}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      {hiddenCount > 0 && <div>{`… +${hiddenCount} lines`}</div>}
    </div>
  );
};
