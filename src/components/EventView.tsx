import type { TimelineEvent } from "../data/types";
import { UserPrompt } from "./UserPrompt";
import { AssistantText } from "./AssistantText";
import { Thinking } from "./Thinking";
import { ToolCall } from "./ToolCall";
import { ToolResult } from "./ToolResult";
import { TodoList } from "./TodoList";

export const EventView: React.FC<{ event: TimelineEvent; frame: number }> = ({ event, frame }) => {
  switch (event.kind) {
    case "user":
      return <UserPrompt text={event.text} startFrame={event.startFrame} frame={frame} />;
    case "assistant":
      return <AssistantText text={event.text} startFrame={event.startFrame} frame={frame} />;
    case "thinking":
      return <Thinking startFrame={event.startFrame} frame={frame} />;
    case "tool_call":
      if (event.name === "TodoWrite" && Array.isArray((event.input as { todos?: unknown }).todos)) {
        return <TodoList todos={(event.input as { todos: never[] }).todos} />;
      }
      return (
        <ToolCall name={event.name} input={event.input} startFrame={event.startFrame} frame={frame} />
      );
    case "tool_result":
      return (
        <ToolResult
          lines={event.lines}
          hiddenCount={event.hiddenCount}
          isError={event.isError}
          startFrame={event.startFrame}
          frame={frame}
        />
      );
  }
};
