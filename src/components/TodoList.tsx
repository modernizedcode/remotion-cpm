import { theme } from "../theme";

interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

const mark: Record<Todo["status"], string> = {
  completed: "✔",
  in_progress: "▸",
  pending: "☐",
};

export const TodoList: React.FC<{ todos: Todo[] }> = ({ todos }) => (
  <div style={{ margin: "6px 0 12px 24px" }}>
    {todos.map((t, i) => (
      <div key={i} style={{ color: t.status === "completed" ? theme.dim : theme.fg }}>
        {mark[t.status]} {t.content}
      </div>
    ))}
  </div>
);
