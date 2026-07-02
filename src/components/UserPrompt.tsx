import { interpolate } from "remotion";
import { theme } from "../theme";
import { timing } from "../data/timing";

export const UserPrompt: React.FC<{ text: string; startFrame: number; frame: number; durationInFrames: number }> = ({
  text,
  startFrame,
  frame,
  durationInFrames,
}) => {
  const elapsed = frame - startFrame;
  const typingFrames = Math.max(1, durationInFrames - timing.caretHoldFrames);
  const naturalRate = 1 / timing.framesPerChar;          // chars per frame at natural speed
  const requiredRate = text.length / typingFrames;        // chars per frame to finish in the slot
  const rate = Math.max(naturalRate, requiredRate);       // never slower than natural; speed up if clamped
  const shown = Math.max(0, Math.min(text.length, Math.floor(elapsed * rate)));
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
