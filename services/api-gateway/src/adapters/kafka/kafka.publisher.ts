import { Injectable, Logger } from "@nestjs/common";
import { MessagePublisher } from "../../application/messaging/message-publisher.interface";
import { KafkaService } from "./kafka.service";

@Injectable()
export class KafkaPublisher implements MessagePublisher {
  private readonly logger = new Logger(KafkaPublisher.name);

  constructor(private readonly kafkaService: KafkaService) {}

  async publish(topic: string, message: any): Promise<void> {
    try {
      await this.kafkaService.publish(topic, message);
      this.logger.log(`Message published to Kafka topic ${topic}`);
    } catch (err) {
      this.logger.error(`Kafka publish failed: ${topic}`, err);
      throw err;
    }
  }
}
