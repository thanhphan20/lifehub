import { IsString, IsNotEmpty, IsNumber, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class WorkoutLogDto {
  @ApiProperty({ example: "bench_press", description: "Type of workout" })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 3, description: "Number of sets" })
  @IsNumber()
  @Min(1)
  sets: number;

  @ApiProperty({ example: 10, description: "Number of reps per set" })
  @IsNumber()
  @Min(1)
  reps: number;

  @ApiProperty({ example: 100, description: "Weight used in kg" })
  @IsNumber()
  @Min(1)
  weight: number;

  @ApiProperty({ example: "3 sets of bench press", description: "Original natural language text", required: false })
  @IsString()
  rawText?: string;
}
