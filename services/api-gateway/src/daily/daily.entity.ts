export type TodoStatus = "pending" | "done" | "skipped";

export interface DailyTodo {
  id: string;
  text: string;
  status: TodoStatus;
}

export interface DailyLog {
  id: string;
  text: string;
  createdAt: string;
}

export class DailyEntry {
  constructor(
    public readonly id: string,
    public date: Date,
    public todos: DailyTodo[],
    public logs: DailyLog[],
    public summary: string | null,
  ) {}

  toObject() {
    return {
      id: this.id,
      date: this.date,
      todos: this.todos,
      logs: this.logs,
      summary: this.summary,
    };
  }
}
