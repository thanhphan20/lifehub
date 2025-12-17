import { Injectable, NotFoundException } from "@nestjs/common";
import { SkillRepository, SelfTestRepository } from "./learning.repository";
import { CreateSkillDto, UpdateSkillProgressDto, CreateSelfTestDto } from "./learning.dto";
import { RedisService } from "../adapters/redis/redis.service";

@Injectable()
export class LearningService {
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly CACHE_KEY_PREFIX = "learning:";

  constructor(
    private readonly skillRepo: SkillRepository,
    private readonly selfTestRepo: SelfTestRepository,
    private readonly redisService: RedisService
  ) {}

  async createSkill(dto: CreateSkillDto) {
    const skill = await this.skillRepo.create({
      name: dto.name,
      proficiency: dto.proficiency || 0,
      notes: dto.notes || null,
    });

    await this.invalidateCache();
    return skill;
  }

  async updateSkillProgress(id: string, dto: UpdateSkillProgressDto) {
    const skill = await this.skillRepo.findById(id);
    if (!skill) throw new NotFoundException("Skill not found");

    const updateData: any = { proficiency: dto.proficiency };
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    const updated = await this.skillRepo.update(id, updateData);
    await this.invalidateCache();
    return updated;
  }

  async getAllSkills() {
    const cacheKey = `${this.CACHE_KEY_PREFIX}skills:all`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const skills = await this.skillRepo.findAll();
    await this.redisService.set(cacheKey, JSON.stringify(skills), this.CACHE_TTL_SECONDS);
    return skills;
  }

  async getSkillById(id: string) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}skill:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const skill = await this.skillRepo.findById(id);
    if (!skill) throw new NotFoundException("Skill not found");

    await this.redisService.set(cacheKey, JSON.stringify(skill), this.CACHE_TTL_SECONDS);
    return skill;
  }

  async createSelfTest(dto: CreateSelfTestDto) {
    const skill = await this.skillRepo.findById(dto.skillId);
    if (!skill) throw new NotFoundException("Skill not found");

    const selfTest = await this.selfTestRepo.create({
      skillId: dto.skillId,
      score: dto.score || null,
      notes: dto.notes || null,
      date: new Date(),
    });

    await this.invalidateCache();
    return selfTest;
  }

  async getSelfTestsBySkill(skillId: string) {
    return this.selfTestRepo.findBySkillId(skillId);
  }

  private async invalidateCache() {
    await this.redisService.del(`${this.CACHE_KEY_PREFIX}skills:all`);
  }
}
