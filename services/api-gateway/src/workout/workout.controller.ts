import { Controller, Post, Body, UsePipes, ValidationPipe } from "@nestjs/common";
import { WorkoutService } from "./workout.service";
import { WorkoutLogDto } from "./workout-log.dto";

@Controller("log")
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post("workout")
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  logWorkout(@Body() workoutLogDto: WorkoutLogDto) {
    return this.workoutService.logWorkout(workoutLogDto);
  }
}
