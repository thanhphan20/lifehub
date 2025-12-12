import { Module } from "@nestjs/common";
import { OutboxModule } from "../outbox/outbox.module";
import { KafkaModule } from "../../adapters/kafka/kafka.module";
import { RabbitMQModule } from "../../adapters/rabbitmq/rabbitmq.module";

@Module({
  imports: [OutboxModule, KafkaModule, RabbitMQModule],
  exports: [OutboxModule],
})
export class MessagingModule {}
