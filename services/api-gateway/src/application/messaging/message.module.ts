import { Module } from "@nestjs/common";
import { OutboxProcessor } from "../outbox/outbox.processor";
import { OutboxModule } from "../outbox/outbox.module";
import { KafkaModule } from "../../adapters/kafka/kafka.module";
import { RabbitMQModule } from "../../adapters/rabbitmq/rabbitmq.module";

@Module({
  imports: [OutboxModule, KafkaModule, RabbitMQModule],
  providers: [OutboxProcessor],
  exports: [OutboxProcessor],
})
export class MessagingModule {}
