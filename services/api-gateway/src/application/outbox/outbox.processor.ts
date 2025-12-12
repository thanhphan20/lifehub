import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { OutboxService } from "./outbox.service";
import { MessagePublisher } from "../messaging/message-publisher.interface";

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    private readonly outboxService: OutboxService,
    @Inject("MessagePublishers") private readonly publishers: MessagePublisher[]
  ) {}

  @Cron("*/30 * * * * *")
  async processPending() {
    const messages = await this.outboxService.getPending();

    for (const msg of messages) {
      for (const publisher of this.publishers) {
        try {
          await publisher.publish(msg.eventType, msg.payload);
        } catch (err) {
          this.logger.error(`Failed to send message ${msg.id}`, err);
          await this.outboxService.markAsFailed(msg.id);
          break;
        }
      }
      await this.outboxService.markAsSent(msg.id);
    }
  }
}
