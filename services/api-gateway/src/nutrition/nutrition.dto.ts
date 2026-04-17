import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsNumber } from "class-validator";

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

  @ApiPropertyOptional({ example: 500, description: "Calories" })
  @IsOptional()
  @IsNumber()
  calories?: number;

  @ApiPropertyOptional({ example: 20, description: "Protein in grams" })
  @IsOptional()
  @IsNumber()
  protein?: number;

  @ApiPropertyOptional({ example: 50, description: "Carbs in grams" })
  @IsOptional()
  @IsNumber()
  carbs?: number;

  @ApiPropertyOptional({ example: 15, description: "Fat in grams" })
  @IsOptional()
  @IsNumber()
  fat?: number;

  @ApiPropertyOptional({ example: "2 eggs and toast", description: "Natural language source text" })
  @IsOptional()
  @IsString()
  rawText?: string;
}
