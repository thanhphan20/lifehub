import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaBaseRepository } from "../application/prisma-base.repository";
import { DailyEntry, DailyTodo } from "./daily.entity";

@Injectable()
export class DailyRepository extends PrismaBaseRepository<DailyEntry> {
  constructor(private prisma: PrismaService) {
    super(prisma.dailyEntry);
  }

  async findByDate(date: Date) {
    return this.prisma.dailyEntry.findUnique({ where: { date } });
  }

  async upsertByDate(date: Date, todos: DailyTodo[], summary: string | null) {
    return this.prisma.dailyEntry.upsert({
      where: { date },
      update: { todos: JSON.stringify(todos), summary },
      create: { date, todos: JSON.stringify(todos), summary },
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
}
