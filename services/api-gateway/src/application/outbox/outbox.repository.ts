import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OutboxMessage } from "../outbox/outbox.entity";
import { PrismaBaseRepository } from "../prisma-base.repository";
import { Outbox, OutboxStatus } from "../../generated/client";

@Injectable()
export class OutboxRepository extends PrismaBaseRepository<Outbox> {
  constructor(private prisma: PrismaService) {
    super(prisma.outbox);
  }

  async create(message: OutboxMessage): Promise<OutboxMessage> {
    const record = await super.create(message.toPrisma());
    return OutboxMessage.fromDb(record);
  }

  async findPending(limit = 50): Promise<Outbox[]> {
    return this.model.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async updateStatus(id: string, status: OutboxStatus): Promise<void> {
    await this.model.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }
}
