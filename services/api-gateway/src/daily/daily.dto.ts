import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class AddTodoDto {
  @ApiProperty({ example: "Write 500 words", description: "Todo text" })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ example: "2025-01-15", description: "Date (YYYY-MM-DD). Defaults to today if omitted." })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class UpdateTodoStatusDto {
  @ApiProperty({ example: "f0f9d1a4-1c23-4bb3-9a9d-1c2b3d4e5f6a", description: "Todo ID" })
  @IsUUID()
  todoId: string;

  @ApiProperty({ example: "done", description: "Todo status", enum: ["pending", "done", "skipped"] })
  @IsString()
  @IsIn(["pending", "done", "skipped"])
  status: "pending" | "done" | "skipped";

  @ApiPropertyOptional({ example: "2025-01-15", description: "Date (YYYY-MM-DD). Defaults to today if omitted." })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class AddDailySummaryDto {
  @ApiProperty({ example: "Wins: shipped mood logging; Blocker: none." })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiPropertyOptional({ example: "2025-01-15", description: "Date (YYYY-MM-DD). Defaults to today if omitted." })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class AddDailyLogDto {
  @ApiProperty({ example: "Ran 5k, 2 protein shakes, focused deep-work block.", description: "Free-text daily activity log line." })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ example: "2025-01-15", description: "Date (YYYY-MM-DD). Defaults to today if omitted." })
  @IsOptional()
  @IsDateString()
  date?: string;
}
