import { Injectable, NotFoundException } from "@nestjs/common";
import { DailyRepository } from "./daily.repository";
import { AddTodoDto, UpdateTodoStatusDto, AddDailySummaryDto, AddDailyLogDto } from "./daily.dto";
import { DailyLog, DailyTodo } from "./daily.entity";
import { EventType, EventDomain, LifeHubEvent } from "../application/messaging/events";
import { randomUUID } from "crypto";

@Injectable()
export class DailyService {
  constructor(private readonly dailyRepo: DailyRepository) {}

  private normalizeDate(dateStr?: string): Date {
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // ponytail: repository stores todos/logs as JSONB strings; read path must parse them back to arrays
  private asArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }
    return [];
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
      id: randomUUID(),
      text: dto.text,
      status: "pending",
    };

    const todos = [...this.asArray<DailyTodo>(entry.todos), todo];
    await this.dailyRepo.updateTodos(date, todos);

    return { date: date.toISOString().slice(0, 10), todo };
  }

  async updateTodoStatus(dto: UpdateTodoStatusDto) {
    const date = this.normalizeDate(dto.date);
    const entry = await this.dailyRepo.findByDate(date);
    if (!entry) throw new NotFoundException("Daily entry not found for date");

    const todos = this.asArray<DailyTodo>(entry.todos);
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

  async addLog(dto: AddDailyLogDto) {
    const date = this.normalizeDate(dto.date);
    const entry = await this.getOrCreate(date);

    const existing = this.asArray<DailyLog>(entry.logs);
    const log: DailyLog = { id: randomUUID(), text: dto.text, createdAt: new Date().toISOString() };

    const correlationId = randomUUID();
    await this.dailyRepo.createLogWithOutbox(
      date,
      log,
      existing,
      {
        eventType: `v1.${EventDomain.DAILY}.${EventType.RAW_INGEST}`,
        payload: {
          version: 1,
          msgId: randomUUID(),
          correlationId,
          timestamp: new Date().toISOString(),
          domain: EventDomain.DAILY,
          type: EventType.RAW_INGEST,
          data: {
            id: "",
            logId: log.id,
            text: dto.text,
            date: date.toISOString().slice(0, 10),
          },
        } as LifeHubEvent,
      },
    );

    return { date: date.toISOString().slice(0, 10), log };
  }

  async getDaily(dateStr?: string) {
    const date = this.normalizeDate(dateStr);
    const entry = await this.getOrCreate(date);
    return {
      date: date.toISOString().slice(0, 10),
      todos: this.asArray<DailyTodo>(entry.todos),
      logs: this.asArray<DailyLog>(entry.logs),
      summary: entry.summary,
    };
  }
}
