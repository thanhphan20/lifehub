import { Injectable } from "@nestjs/common";
import { OutboxMessage } from "./outbox.entity";
import { OutboxRepository } from "./outbox.repository";
import { OutboxStatus } from "../../generated/client";

@Injectable()
export class OutboxService {
  constructor(private readonly outboxRepo: OutboxRepository) {}

  async save(eventType: string, payload: any) {
    const message = new OutboxMessage(eventType, payload);
    return this.outboxRepo.create(message);
  }

  async markAsProcessing(id: string) {
    return this.outboxRepo.updateStatus(id, OutboxStatus.PROCESSING);
  }

  async markAsSent(id: string) {
    return this.outboxRepo.updateStatus(id, OutboxStatus.SENT);
  }

  async markAsFailed(id: string) {
    return this.outboxRepo.updateStatus(id, OutboxStatus.FAILED);
  }

  async getPending(limit = 50) {
    return this.outboxRepo.findPending(limit);
  }
}
