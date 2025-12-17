import { Module } from "@nestjs/common";
import { LearningController } from "./learning.controller";
import { LearningService } from "./learning.service";
import { SkillRepository, SelfTestRepository } from "./learning.repository";

@Module({
  controllers: [LearningController],
  providers: [LearningService, SkillRepository, SelfTestRepository],
})
export class LearningModule {}
