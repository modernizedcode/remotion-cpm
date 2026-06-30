import { Composition } from "remotion";
import { Terminal } from "./Terminal";
import conversation from "./data/conversation.json";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Conversation"
      component={Terminal}
      durationInFrames={conversation.totalFrames}
      fps={30}
      width={3840}
      height={2160}
    />
  );
};
