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
