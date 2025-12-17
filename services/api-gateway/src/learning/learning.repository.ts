import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaBaseRepository } from "../application/prisma-base.repository";
import { Skill, SelfTest } from "./learning.entity";

@Injectable()
export class SkillRepository extends PrismaBaseRepository<Skill> {
  constructor(private prisma: PrismaService) {
    super(prisma.skill);
  }

  async findById(id: string) {
    return this.prisma.skill.findUnique({ where: { id } });
  }
}

@Injectable()
export class SelfTestRepository extends PrismaBaseRepository<SelfTest> {
  constructor(private prisma: PrismaService) {
    super(prisma.selfTest);
  }

  async findBySkillId(skillId: string) {
    return this.prisma.selfTest.findMany({
      where: { skillId },
      orderBy: { date: "desc" },
    });
  }
}
