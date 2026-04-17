import { Module } from "@nestjs/common";
import { OutboxModule } from "../outbox/outbox.module";
import { KafkaModule } from "../../adapters/kafka/kafka.module";
import { RabbitMQModule } from "../../adapters/rabbitmq/rabbitmq.module";
import { SagaTrackerProcessor } from "./saga-tracker.processor";
import { NutritionModule } from "../../nutrition/nutrition.module";
import { WorkoutModule } from "../../workout/workout.module";

@Module({
  imports: [OutboxModule, KafkaModule, RabbitMQModule, NutritionModule, WorkoutModule],
  providers: [SagaTrackerProcessor],
  exports: [OutboxModule],
})
export class MessagingModule {}
