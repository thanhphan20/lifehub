import { Controller, Post, Body, Get, Param, Query, Req, HttpCode, HttpStatus, ParseIntPipe } from "@nestjs/common";
import { Request } from "express";
import { WorkoutService } from "./workout.service";
import { WorkoutLogDto } from "./workout-log.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from "@nestjs/swagger";

@ApiTags("workouts")
@Controller("workouts")
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new workout log" })
  @ApiResponse({ status: 201, description: "Workout log created successfully" })
  async logWorkout(@Body() workoutLogDto: WorkoutLogDto, @Req() req: Request) {
    const correlationId = (req.headers["x-correlation-id"] as string) || undefined;
    const result = await this.workoutService.logWorkout(workoutLogDto, correlationId);
    return {
      message: "Workout log created successfully",
      id: result.id,
      correlationId: correlationId || null,
    };
  }

  @Get()
  @ApiOperation({ summary: "Get all workout logs with pagination" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Number of records to return" })
  @ApiQuery({ name: "offset", required: false, type: Number, description: "Number of records to skip" })
  @ApiResponse({ status: 200, description: "List of workout logs" })
  async getWorkoutLogs(
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("offset", new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.workoutService.getWorkoutLogs(limit || 10, offset || 0);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a workout log by ID" })
  @ApiParam({ name: "id", description: "Workout log ID" })
  @ApiResponse({ status: 200, description: "Workout log details" })
  @ApiResponse({ status: 404, description: "Workout log not found" })
  async getWorkoutLogById(@Param("id") id: string) {
    const log = await this.workoutService.getWorkoutLogById(id);
    if (!log) {
      throw new Error("Workout log not found");
    }
    return log;
  }

  @Get("stats")
  @ApiOperation({ summary: "Get workout statistics for a period" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["day", "week", "month", "year"],
    description: "Stats period (default: week)",
  })
  @ApiResponse({ status: 200, description: "Workout statistics" })
  async getWorkoutStats(@Query("period") period?: string) {
    return this.workoutService.getWorkoutStats(period);
  }
}
