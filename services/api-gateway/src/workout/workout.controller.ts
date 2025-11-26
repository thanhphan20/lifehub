import { Controller, Post, Body, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { Request } from "express";
import { WorkoutService } from "./workout.service";
import { WorkoutLogDto } from "./workout-log.dto";

@Controller("log")
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post("workout")
  @HttpCode(HttpStatus.ACCEPTED)
  async logWorkout(@Body() workoutLogDto: WorkoutLogDto, @Req() req: Request) {
    const correlationId = (req.headers["x-correlation-id"] as string) || undefined;
    await this.workoutService.logWorkout(workoutLogDto, correlationId);
    return {
      message: "Workout log accepted",
      correlationId: correlationId || null,
    };
  }
}
