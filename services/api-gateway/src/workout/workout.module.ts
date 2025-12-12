import { Module } from "@nestjs/common";
import { WorkoutController } from "./workout.controller";
import { WorkoutService } from "./workout.service";
import { WorkoutRepository } from "./workout.repository";
import { RabbitMQPublisher } from "../adapters/rabbitmq/rabbitmq.publisher";
import { KafkaPublisher } from "../adapters/kafka/kafka.publisher";

@Module({
  controllers: [WorkoutController],
  providers: [
    WorkoutService,
    WorkoutRepository,
    RabbitMQPublisher,
    KafkaPublisher,
    {
      provide: "MessagePublishers",
      useFactory: (kafka: KafkaPublisher, rabbitmq: RabbitMQPublisher) => {
        return [kafka, rabbitmq];
      },
      inject: [KafkaPublisher, RabbitMQPublisher],
    },
  ],
})
export class WorkoutModule {}
