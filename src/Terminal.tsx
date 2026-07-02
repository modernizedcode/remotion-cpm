import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/JetBrainsMono";
import { useRef, useEffect, useState } from "react";
import { theme } from "./theme";
import conversation from "./data/conversation.json";
import type { TimelineEvent } from "./data/types";
import { EventView } from "./components/EventView";

const { fontFamily } = loadFont();
const events = conversation.events as TimelineEvent[];

export const Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const visible = events.filter((e) => e.startFrame <= frame);

  // Real-terminal scroll: measure stack height; translate up so the bottom stays in view.
  const stackRef = useRef<HTMLDivElement>(null);
  const [stackHeight, setStackHeight] = useState(0);
  useEffect(() => {
    if (stackRef.current) setStackHeight(stackRef.current.scrollHeight);
  });
  const pad = 80;
  const usable = height - pad * 2;
  const translateY = Math.min(0, usable - stackHeight);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily, color: theme.fg, padding: pad }}>
      <div style={{ transform: `translateY(${translateY}px)` }}>
        <div ref={stackRef} style={{ fontSize: 34, lineHeight: 1.45 }}>
          {visible.map((e, i) => (
            <EventView key={i} event={e} frame={frame} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
