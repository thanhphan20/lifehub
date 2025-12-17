import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateSkillDto {
  @ApiProperty({ example: "TypeScript", description: "Skill name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 60, description: "Self-assessed proficiency (0-100)", minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  proficiency?: number;

  @ApiPropertyOptional({ example: "Learning advanced types", description: "Notes about the skill" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSkillProgressDto {
  @ApiProperty({ example: 75, description: "Updated proficiency (0-100)", minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  proficiency: number;

  @ApiPropertyOptional({ example: "Completed advanced types course", description: "Update notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSelfTestDto {
  @ApiProperty({ example: "f0f9d1a4-1c23-4bb3-9a9d-1c2b3d4e5f6a", description: "Skill ID" })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiPropertyOptional({ example: 85, description: "Test score (0-100)", minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional({ example: "Passed all type challenges", description: "Test notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
