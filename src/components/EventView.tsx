import type { TimelineEvent } from "../data/types";

export const EventView: React.FC<{ event: TimelineEvent; frame: number }> = ({ event }) => {
  return <div>{event.kind}</div>;
};
