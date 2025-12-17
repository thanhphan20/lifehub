import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMealDto {
  @ApiProperty({ example: "2 eggs, 1 slice of toast", description: "Natural language description of the meal" })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    example: "2025-01-15",
    description: "Date of the meal (YYYY-MM-DD). Defaults to today if omitted.",
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
