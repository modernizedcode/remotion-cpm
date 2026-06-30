import { Composition } from "remotion";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Conversation"
      component={() => null}
      durationInFrames={30}
      fps={30}
      width={3840}
      height={2160}
    />
  );
};
