import { Module } from "@nestjs/common";
import { WorkoutController } from "./workout.controller";
import { WorkoutService } from "./workout.service";
import { KafkaService } from "../kafka/kafka.service";

@Module({
  controllers: [WorkoutController],
  providers: [WorkoutService, KafkaService],
})
export class WorkoutModule {}
