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
        data: dto,
      });

      await tx.outbox.create({
        data: {
          eventType: event.eventType,
          payload: event.payload,
          status: "PENDING",
        },
      });

      return workout;
    });
  }
}
