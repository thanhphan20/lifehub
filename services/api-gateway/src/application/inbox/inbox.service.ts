import { Injectable } from "@nestjs/common";
import { InboxRepository } from "./inbox.repository";
import { InboxStatus } from "../../generated/client";

@Injectable()
export class InboxService {
  constructor(private readonly inboxRepo: InboxRepository) {}

  async claim(msgId: string, eventType: string, payload: unknown): Promise<{ inboxId: string | null; duplicate: boolean }> {
    const existing = await this.inboxRepo.createIfAbsent(msgId, eventType, payload);
    // ponytail: insert-first-then-update, no transaction with domain updates — domain updates are idempotent and partial failures recover via the FAILED retry cron.
    const duplicate = existing.status === InboxStatus.COMPLETED || existing.status === InboxStatus.PROCESSING;
    return { inboxId: existing.id, duplicate };
  }

  async markCompleted(id: string) {
    return this.inboxRepo.updateStatus(id, InboxStatus.COMPLETED, new Date());
  }

  async markFailed(id: string) {
    await this.inboxRepo.incrementRetries(id);
    return this.inboxRepo.updateStatus(id, InboxStatus.FAILED);
  }

  async getFailedForRetry(limit = 10, maxRetries = 5) {
    return this.inboxRepo.findFailedForRetry(limit, maxRetries);
  }
}
