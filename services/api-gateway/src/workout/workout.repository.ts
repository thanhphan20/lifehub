import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkoutLog } from "./workout.entity";
import { PrismaBaseRepository } from "../application/prisma-base.repository";

@Injectable()
export class WorkoutRepository extends PrismaBaseRepository<WorkoutLog> {
  constructor(private prisma: PrismaService) {
    super(prisma.workoutLog);
  }
}
