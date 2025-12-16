import { Module } from "@nestjs/common";
import { WorkoutController } from "./workout.controller";
import { WorkoutService } from "./workout.service";
import { WorkoutRepository } from "./workout.repository";
import { RabbitMQPublisher } from "../adapters/rabbitmq/rabbitmq.publisher";
import { KafkaPublisher } from "../adapters/kafka/kafka.publisher";
import { MessagePublisher } from "../application/messaging/message-publisher.interface";
import { OutboxModule } from "../application/outbox/outbox.module";

@Module({
  imports: [OutboxModule],
  controllers: [WorkoutController],
  providers: [
    WorkoutService,
    WorkoutRepository,
    RabbitMQPublisher,
    KafkaPublisher,
    {
      provide: "MessagePublishers",
      useFactory: (kafka: KafkaPublisher, rabbitmq: RabbitMQPublisher): MessagePublisher => {
        return {
          publish: async (topic: string, message: any, options?: { correlationId?: string } | any) => {
            await Promise.all([kafka.publish(topic, message, options), rabbitmq.publish(topic, message, options)]);
          },
        };
      },
      inject: [KafkaPublisher, RabbitMQPublisher],
    },
  ],
})
export class WorkoutModule {}
