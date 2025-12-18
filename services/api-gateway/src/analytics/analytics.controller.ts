import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("daily")
  @ApiOperation({ summary: "Get daily analytics summary" })
  @ApiQuery({ name: "date", required: false, description: "Date in YYYY-MM-DD format (defaults to today)" })
  @ApiResponse({ status: 200, description: "Daily analytics summary" })
  async getDailyAnalytics(@Query("date") date?: string) {
    return this.analyticsService.getDailySummary(date);
  }

  @Get("weekly")
  @ApiOperation({ summary: "Get weekly analytics summary" })
  @ApiQuery({ name: "week", required: false, description: "Week in YYYY-WW format (defaults to current week)" })
  @ApiResponse({ status: 200, description: "Weekly analytics summary" })
  async getWeeklyAnalytics(@Query("week") week?: string) {
    return this.analyticsService.getWeeklySummary(week);
  }

  @Get("correlations")
  @ApiOperation({ summary: "Get correlations between metrics" })
  @ApiQuery({ name: "period", required: false, enum: ["week", "month"], description: "Time period" })
  @ApiResponse({ status: 200, description: "Metric correlations" })
  async getCorrelations(@Query("period") period?: string) {
    return this.analyticsService.getCorrelations(period);
  }
}
