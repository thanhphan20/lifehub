import { Injectable, Logger } from "@nestjs/common";
import { MessagePublisher } from "../../application/messaging/message-publisher.interface";
import { RabbitMQService } from "./rabbitmq.service";

@Injectable()
export class RabbitMQPublisher implements MessagePublisher {
  private readonly logger = new Logger(RabbitMQPublisher.name);

  constructor(private readonly rabbitService: RabbitMQService) {}

  async publish(topic: string, message: any): Promise<void> {
    try {
      await this.rabbitService.publish(topic, message);
      this.logger.log(`Message published to RabbitMQ queue ${topic}`);
    } catch (err) {
      this.logger.error(`RabbitMQ publish failed: ${topic}`, err);
      throw err;
    }
  }
}
