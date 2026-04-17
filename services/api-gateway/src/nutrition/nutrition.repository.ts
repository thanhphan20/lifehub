import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaBaseRepository } from "../application/prisma-base.repository";
import { MealLog } from "./nutrition.entity";

@Injectable()
export class NutritionRepository extends PrismaBaseRepository<MealLog> {
  constructor(private prisma: PrismaService) {
    super(prisma.mealLog);
  }

  async createWithOutbox(data: any, event: { eventType: string; payload: any }) {
    return this.prisma.$transaction(async (tx) => {
      const meal = await tx.mealLog.create({
        data: {
          ...data,
          correlationId: event.payload.correlationId,
          enrichmentStatus: data.rawText || (!data.calories && data.description) ? "PENDING" : "NOT_REQUIRED",
          rawText: data.rawText || data.description,
        },
      });

      // Update payload with actual ID
      const payload = { ...event.payload, id: meal.id };

      await tx.outbox.create({
        data: {
          eventType: event.eventType,
          payload: payload,
          status: "PENDING",
        },
      });

      return meal;
    });
  }

  async findByDate(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    return this.prisma.mealLog.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async getStatsByPeriod(startDate: Date, endDate: Date) {
    const meals = await this.prisma.mealLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    if (meals.length === 0) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        count: 0,
      };
    }

    return meals.reduce(
      (acc, meal) => {
        return {
          calories: acc.calories + meal.calories,
          protein: acc.protein + meal.protein,
          carbs: acc.carbs + meal.carbs,
          fat: acc.fat + meal.fat,
          count: acc.count + 1,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
    );
  }
}
