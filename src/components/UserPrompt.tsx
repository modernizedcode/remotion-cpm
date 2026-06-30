import { interpolate } from "remotion";
import { theme } from "../theme";
import { timing } from "../data/timing";

export const UserPrompt: React.FC<{ text: string; startFrame: number; frame: number }> = ({
  text,
  startFrame,
  frame,
}) => {
  const elapsed = frame - startFrame;
  const shown = Math.max(0, Math.min(text.length, Math.floor(elapsed / timing.framesPerChar)));
  const typing = shown < text.length;
  const caretOn = Math.floor(frame / 15) % 2 === 0;
  return (
    <div
      style={{
        border: `2px solid ${theme.dim}`,
        borderRadius: 8,
        padding: "12px 18px",
        margin: "14px 0",
        color: theme.user,
        whiteSpace: "pre-wrap",
      }}
    >
      {"> "}
      {text.slice(0, shown)}
      {(typing || caretOn) && <span style={{ color: theme.caret }}>▋</span>}
    </div>
  );
};
