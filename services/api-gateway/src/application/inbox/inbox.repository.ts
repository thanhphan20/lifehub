import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../prisma/prisma.service";
import { InboxMessage } from "./inbox.entity";
import { PrismaBaseRepository } from "../prisma-base.repository";
import { InboxMessage as InboxMessageRecord, InboxStatus, Prisma } from "../../generated/client";

@Injectable()
export class InboxRepository extends PrismaBaseRepository<InboxMessageRecord> {
  constructor(private prisma: PrismaService) {
    super(prisma.inboxMessage);
  }

  async createIfAbsent(msgId: string, eventType: string, payload: unknown): Promise<InboxMessage> {
    try {
      const message = new InboxMessage(uuidv4(), msgId, eventType, payload);
      const record = await super.create(message.toPrisma());
      return InboxMessage.fromDb(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.model.findUnique({ where: { msgId } });
        if (!existing) throw error;
        return InboxMessage.fromDb(existing);
      }
      throw error;
    }
  }

  async updateStatus(id: string, status: InboxStatus, processedAt?: Date): Promise<void> {
    await this.model.update({
      where: { id },
      data: { status, processedAt, updatedAt: new Date() },
    });
  }

  async findFailedForRetry(limit = 10, maxRetries = 5): Promise<InboxMessageRecord[]> {
    return this.model.findMany({
      where: { status: InboxStatus.FAILED, retries: { lt: maxRetries } },
      orderBy: { updatedAt: "asc" },
      take: limit,
    });
  }

  async incrementRetries(id: string): Promise<void> {
    await this.model.update({
      where: { id },
      data: { retries: { increment: 1 }, updatedAt: new Date() },
    });
  }
}
