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
