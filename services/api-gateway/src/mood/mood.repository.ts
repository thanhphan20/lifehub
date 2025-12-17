import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MoodLog } from "./mood.entity";
import { MoodLogDto } from "./mood-log.dto";
import { PrismaBaseRepository } from "../application/prisma-base.repository";

@Injectable()
export class MoodRepository extends PrismaBaseRepository<MoodLog> {
  constructor(private prisma: PrismaService) {
    super(prisma.moodLog);
  }

  async createWithOutbox(dto: MoodLogDto, event: { eventType: string; payload: any }) {
    return this.prisma.$transaction(async (tx) => {
      const moodLog = await tx.moodLog.create({
        data: {
          rating: dto.rating,
          tags: dto.tags || [],
          notes: dto.notes || null,
        },
      });

      await tx.outbox.create({
        data: {
          eventType: event.eventType,
          payload: event.payload,
          status: "PENDING",
        },
      });

      return moodLog;
    });
  }

  // Uses base repository's findAllWithPagination method

  async findById(id: string) {
    return this.prisma.moodLog.findUnique({
      where: { id },
    });
  }

  async getStatsByPeriod(startDate: Date, endDate: Date) {
    const logs = await this.prisma.moodLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (logs.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        count: 0,
        distribution: {},
      };
    }

    const ratings = logs.map((log) => log.rating);
    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);

    // Distribution by rating (1-10)
    const distribution: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) {
      distribution[i] = 0;
    }
    ratings.forEach((rating) => {
      distribution[rating] = (distribution[rating] || 0) + 1;
    });

    // Tag frequency
    const tagFrequency: Record<string, number> = {};
    logs.forEach((log) => {
      log.tags.forEach((tag) => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
    });

    return {
      average: Math.round(average * 100) / 100,
      min,
      max,
      count: logs.length,
      distribution,
      tagFrequency,
      logs: logs.map((log) => ({
        id: log.id,
        rating: log.rating,
        tags: log.tags,
        notes: log.notes,
        createdAt: log.createdAt,
      })),
    };
  }
}
