import { Controller, Post, Body, Get, Param, Query, Req, HttpCode, HttpStatus, ParseIntPipe } from "@nestjs/common";
import { Request } from "express";
import { MoodService } from "./mood.service";
import { MoodLogDto } from "./mood-log.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from "@nestjs/swagger";

@ApiTags("mood")
@Controller("mood")
export class MoodController {
  constructor(private readonly moodService: MoodService) {}

  @Post("logs")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new mood log entry" })
  @ApiResponse({ status: 201, description: "Mood log created successfully" })
  async logMood(@Body() moodLogDto: MoodLogDto, @Req() req: Request) {
    const correlationId = (req.headers["x-correlation-id"] as string) || undefined;
    const result = await this.moodService.logMood(moodLogDto, correlationId);
    return {
      message: "Mood log created successfully",
      id: result.id,
      correlationId: correlationId || null,
    };
  }

  @Get("logs")
  @ApiOperation({ summary: "Get all mood logs with pagination" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default: 1)" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Number of records per page (default: 20)" })
  @ApiResponse({ status: 200, description: "List of mood logs" })
  async getMoodLogs(
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.moodService.getMoodLogs(page || 1, limit || 20);
  }

  @Get("logs/:id")
  @ApiOperation({ summary: "Get a mood log by ID" })
  @ApiParam({ name: "id", description: "Mood log ID" })
  @ApiResponse({ status: 200, description: "Mood log details" })
  @ApiResponse({ status: 404, description: "Mood log not found" })
  async getMoodLogById(@Param("id") id: string) {
    const log = await this.moodService.getMoodLogById(id);
    if (!log) {
      throw new Error("Mood log not found");
    }
    return log;
  }

  @Get("stats")
  @ApiOperation({ summary: "Get mood statistics for a period" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["day", "week", "month", "year"],
    description: "Time period for statistics (default: week)",
  })
  @ApiResponse({ status: 200, description: "Mood statistics" })
  async getMoodStats(@Query("period") period?: string) {
    return this.moodService.getMoodStats(period);
  }
}
