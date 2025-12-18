import { Injectable, NotFoundException } from "@nestjs/common";
import { DailyRepository } from "./daily.repository";
import { AddTodoDto, UpdateTodoStatusDto, AddDailySummaryDto } from "./daily.dto";
import { DailyTodo } from "./daily.entity";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class DailyService {
  constructor(private readonly dailyRepo: DailyRepository) {}

  private normalizeDate(dateStr?: string): Date {
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private async getOrCreate(date: Date) {
    const existing = await this.dailyRepo.findByDate(date);
    if (existing) return existing;
    return this.dailyRepo.upsertByDate(date, [], null);
  }

  async addTodo(dto: AddTodoDto) {
    const date = this.normalizeDate(dto.date);
    const entry = await this.getOrCreate(date);

    const todo: DailyTodo = {
      id: uuidv4(),
      text: dto.text,
      status: "pending",
    };

    const todos = Array.isArray(entry.todos) ? [...(entry.todos as unknown as DailyTodo[]), todo] : [todo];
    await this.dailyRepo.updateTodos(date, todos);

    return { date: date.toISOString().slice(0, 10), todo };
  }

  async updateTodoStatus(dto: UpdateTodoStatusDto) {
    const date = this.normalizeDate(dto.date);
    const entry = await this.dailyRepo.findByDate(date);
    if (!entry) throw new NotFoundException("Daily entry not found for date");

    const todos = Array.isArray(entry.todos) ? (entry.todos as unknown as DailyTodo[]) : [];
    const updatedTodos = todos.map((t) => (t.id === dto.todoId ? { ...t, status: dto.status } : t));

    const found = updatedTodos.some((t) => t.id === dto.todoId);
    if (!found) throw new NotFoundException("Todo not found for date");

    await this.dailyRepo.updateTodos(date, updatedTodos);
    return { date: date.toISOString().slice(0, 10), todoId: dto.todoId, status: dto.status };
  }

  async addSummary(dto: AddDailySummaryDto) {
    const date = this.normalizeDate(dto.date);
    await this.getOrCreate(date);
    await this.dailyRepo.updateSummary(date, dto.summary);
    return { date: date.toISOString().slice(0, 10), summary: dto.summary };
  }

  async getDaily(dateStr?: string) {
    const date = this.normalizeDate(dateStr);
    const entry = await this.getOrCreate(date);
    return {
      date: date.toISOString().slice(0, 10),
      todos: entry.todos || [],
      summary: entry.summary,
    };
  }
}
