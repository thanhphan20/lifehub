import { IsNumber, IsOptional, IsString, IsArray, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MoodLogDto {
  @ApiProperty({ example: 7, description: "Mood rating from 1-10", minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  rating: number;

  @ApiPropertyOptional({
    example: ["calm", "focused"],
    description: "Optional mood tags",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: "Feeling good after workout", description: "Optional notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
