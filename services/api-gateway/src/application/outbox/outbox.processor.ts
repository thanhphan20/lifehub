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

  @Cron("*/5 * * * * *")
  async processPending() {
    const messages = await this.outboxService.getPending();

    if (messages.length === 0) {
      return;
    }

    this.logger.debug(`Processing ${messages.length} pending outbox messages`);

    for (const msg of messages) {
      // Mark as PROCESSING to avoid race conditions with concurrent cron runs
      await this.outboxService.markAsProcessing(msg.id);

      let allSucceeded = true;

      // Extract correlationId from payload if it exists
      const correlationId = (msg.payload as any)?.correlationId;

      // Try to publish to all publishers
      for (const publisher of this.publishers) {
        try {
          await publisher.publish(msg.eventType, msg.payload, { correlationId });
        } catch (err) {
          this.logger.error(`Failed to send message ${msg.id}`, err);
          allSucceeded = false;
          break; // Stop trying other publishers if one fails
        }
      }

      // Only mark as SENT if all publishers succeeded
      if (allSucceeded) {
        await this.outboxService.markAsSent(msg.id);
        this.logger.debug(`Message ${msg.id} successfully published to all brokers`);
      } else {
        await this.outboxService.markAsFailed(msg.id);
        this.logger.warn(`Message ${msg.id} failed to publish, marked as FAILED`);
      }
    }
  }
}
