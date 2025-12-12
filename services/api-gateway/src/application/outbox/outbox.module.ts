import { Module } from "@nestjs/common";
import { OutboxService } from "./outbox.service";
import { OutboxProcessor } from "./outbox.processor";
import { OutboxRepository } from "./outbox.repository";
import { RabbitMQPublisher } from "../../adapters/rabbitmq/rabbitmq.publisher";
import { KafkaPublisher } from "../../adapters/kafka/kafka.publisher";

@Module({
  providers: [
    OutboxService,
    OutboxRepository,
    OutboxProcessor,
    KafkaPublisher,
    RabbitMQPublisher,
    {
      provide: "MessagePublishers",
      useFactory: (kafka: KafkaPublisher, rabbit: RabbitMQPublisher) => [kafka, rabbit],
      inject: [KafkaPublisher, RabbitMQPublisher],
    },
  ],
  exports: [OutboxProcessor, OutboxService],
})
export class OutboxModule {}
