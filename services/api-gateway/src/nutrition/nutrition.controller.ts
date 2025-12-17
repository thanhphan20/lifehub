import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { NutritionService } from "./nutrition.service";
import { CreateMealDto } from "./nutrition.dto";

@ApiTags("nutrition")
@Controller("nutrition")
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post("meals")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Log a meal using natural language" })
  @ApiResponse({ status: 201, description: "Meal logged successfully" })
  async logMeal(@Body() dto: CreateMealDto) {
    const meal = await this.nutritionService.logMeal(dto);
    return {
      message: "Meal logged successfully",
      meal,
    };
  }

  @Get("meals")
  @ApiOperation({ summary: "Get meals for a specific date" })
  @ApiQuery({ name: "date", required: true, description: "Date in YYYY-MM-DD format" })
  @ApiResponse({ status: 200, description: "List of meals for the date" })
  async getMealsByDate(@Query("date") date: string) {
    return this.nutritionService.getMealsByDate(date);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get nutrition stats for a period" })
  @ApiQuery({ name: "period", required: false, enum: ["day", "week", "month", "year"], description: "Stats period" })
  @ApiResponse({ status: 200, description: "Nutrition statistics" })
  async getStats(@Query("period") period?: string) {
    return this.nutritionService.getStats(period);
  }
}
