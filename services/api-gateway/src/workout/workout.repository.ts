import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkoutLog } from "./workout.entity";
import { WorkoutLogDto } from "./workout-log.dto";
import { PrismaBaseRepository } from "../application/prisma-base.repository";

@Injectable()
export class WorkoutRepository extends PrismaBaseRepository<WorkoutLog> {
  constructor(private prisma: PrismaService) {
    super(prisma.workoutLog);
  }

  async createWithOutbox(dto: WorkoutLogDto, event: { eventType: string; payload: any }) {
    return this.prisma.$transaction(async (tx) => {
      const workout = await tx.workoutLog.create({
        data: {
          ...dto,
          correlationId: event.payload.correlationId,
          enrichmentStatus: dto.rawText ? "PENDING" : "NOT_REQUIRED",
          rawText: dto.rawText,
        },
      });

      await tx.outbox.create({
        data: {
          eventType: event.eventType,
          payload: { ...event.payload, id: workout.id },
          status: "PENDING",
        },
      });

      return workout;
    });
  }

  async getStatsByPeriod(startDate: Date, endDate: Date) {
    const logs = await this.prisma.workoutLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (logs.length === 0) {
      return {
        count: 0,
        totalSets: 0,
        totalReps: 0,
        totalVolume: 0,
        averageSets: 0,
        averageReps: 0,
        averageVolume: 0,
      };
    }

    interface WorkoutTotals {
      count: number;
      totalSets: number;
      totalReps: number;
      totalVolume: number;
    }

    const totals = logs.reduce<WorkoutTotals>(
      (acc, log) => {
        const volume = log.sets * log.reps * log.weight;
        return {
          count: acc.count + 1,
          totalSets: acc.totalSets + log.sets,
          totalReps: acc.totalReps + log.reps,
          totalVolume: acc.totalVolume + volume,
        };
      },
      { count: 0, totalSets: 0, totalReps: 0, totalVolume: 0 },
    );

    return {
      ...totals,
      averageSets: Math.round((totals.totalSets / totals.count) * 100) / 100,
      averageReps: Math.round((totals.totalReps / totals.count) * 100) / 100,
      averageVolume: Math.round((totals.totalVolume / totals.count) * 100) / 100,
    };
  }
}
