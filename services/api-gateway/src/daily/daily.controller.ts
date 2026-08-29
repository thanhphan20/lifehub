import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DailyService } from "./daily.service";
import { AddTodoDto, UpdateTodoStatusDto, AddDailySummaryDto, AddDailyLogDto } from "./daily.dto";

@ApiTags("daily")
@Controller("daily")
export class DailyController {
  constructor(private readonly dailyService: DailyService) {}

  @Post("todos")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a todo for a date (defaults to today)" })
  @ApiResponse({ status: 201, description: "Todo created" })
  async addTodo(@Body() dto: AddTodoDto) {
    return this.dailyService.addTodo(dto);
  }

  @Post("log")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a free-text daily activity log line (defaults to today)" })
  @ApiResponse({ status: 201, description: "Log saved and raw.ingest event emitted" })
  async addLog(@Body() dto: AddDailyLogDto) {
    return this.dailyService.addLog(dto);
  }

  @Patch("todos/status")
  @ApiOperation({ summary: "Update todo status (pending | done | skipped)" })
  @ApiResponse({ status: 200, description: "Todo status updated" })
  async updateStatus(@Body() dto: UpdateTodoStatusDto) {
    return this.dailyService.updateTodoStatus(dto);
  }

  @Post("summary")
  @ApiOperation({ summary: "Add or replace the day summary" })
  @ApiResponse({ status: 200, description: "Summary saved" })
  async addSummary(@Body() dto: AddDailySummaryDto) {
    return this.dailyService.addSummary(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get todos and summary for a date" })
  @ApiQuery({ name: "date", required: false, description: "Date (YYYY-MM-DD). Defaults to today." })
  @ApiResponse({ status: 200, description: "Daily entry" })
  async getDaily(@Query("date") date?: string) {
    return this.dailyService.getDaily(date);
  }
}
