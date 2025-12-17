import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { LearningService } from "./learning.service";
import { CreateSkillDto, UpdateSkillProgressDto, CreateSelfTestDto } from "./learning.dto";

@ApiTags("learning")
@Controller("learning")
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post("skills")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new skill to track" })
  @ApiResponse({ status: 201, description: "Skill created" })
  async createSkill(@Body() dto: CreateSkillDto) {
    return this.learningService.createSkill(dto);
  }

  @Get("skills")
  @ApiOperation({ summary: "Get all skills" })
  @ApiResponse({ status: 200, description: "List of skills" })
  async getAllSkills() {
    return this.learningService.getAllSkills();
  }

  @Get("skills/:id")
  @ApiOperation({ summary: "Get skill by ID" })
  @ApiParam({ name: "id", description: "Skill ID" })
  @ApiResponse({ status: 200, description: "Skill details" })
  async getSkillById(@Param("id") id: string) {
    return this.learningService.getSkillById(id);
  }

  @Patch("skills/:id/progress")
  @ApiOperation({ summary: "Update skill proficiency progress" })
  @ApiParam({ name: "id", description: "Skill ID" })
  @ApiResponse({ status: 200, description: "Progress updated" })
  async updateProgress(@Param("id") id: string, @Body() dto: UpdateSkillProgressDto) {
    return this.learningService.updateSkillProgress(id, dto);
  }

  @Post("self-tests")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Log a self-test for a skill" })
  @ApiResponse({ status: 201, description: "Self-test created" })
  async createSelfTest(@Body() dto: CreateSelfTestDto) {
    return this.learningService.createSelfTest(dto);
  }

  @Get("skills/:id/self-tests")
  @ApiOperation({ summary: "Get self-tests for a skill" })
  @ApiParam({ name: "id", description: "Skill ID" })
  @ApiResponse({ status: 200, description: "List of self-tests" })
  async getSelfTests(@Param("id") id: string) {
    return this.learningService.getSelfTestsBySkill(id);
  }
}
