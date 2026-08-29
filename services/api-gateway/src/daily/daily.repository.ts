import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaBaseRepository } from "../application/prisma-base.repository";
import { DailyEntry, DailyLog, DailyTodo } from "./daily.entity";

@Injectable()
export class DailyRepository extends PrismaBaseRepository<DailyEntry> {
  constructor(private prisma: PrismaService) {
    super(prisma.dailyEntry);
  }

  async findByDate(date: Date) {
    return this.prisma.dailyEntry.findUnique({ where: { date } });
  }

  async upsertByDate(date: Date, todos: DailyTodo[], summary: string | null, logs: DailyLog[] = []) {
    return this.prisma.dailyEntry.upsert({
      where: { date },
      update: { todos: JSON.stringify(todos), summary, logs: JSON.stringify(logs) },
      create: { date, todos: JSON.stringify(todos), summary, logs: JSON.stringify(logs) },
    });
  }

  async updateTodos(date: Date, todos: DailyTodo[]) {
    return this.prisma.dailyEntry.update({
      where: { date },
      data: { todos: JSON.stringify(todos) },
    });
  }

  async updateSummary(date: Date, summary: string) {
    return this.prisma.dailyEntry.update({
      where: { date },
      data: { summary },
    });
  }

  async createLogWithOutbox(
    date: Date,
    log: DailyLog,
    existingLogs: DailyLog[],
    event: { eventType: string; payload: any },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const logs = [...existingLogs, log];
      const entry = await tx.dailyEntry.upsert({
        where: { date },
        update: { logs: JSON.stringify(logs) },
        create: {
          date,
          todos: JSON.stringify([]),
          logs: JSON.stringify(logs),
          summary: null,
        },
      });

      const payload = { ...event.payload, id: entry.id };

      await tx.outbox.create({
        data: {
          eventType: event.eventType,
          payload: payload,
          status: "PENDING",
        },
      });

      return entry;
    });
  }
}
