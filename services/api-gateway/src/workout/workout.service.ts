import { Injectable, Logger, Inject, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { WorkoutLogDto } from "./workout-log.dto";
import { KafkaService } from "../kafka/kafka.service";

@Injectable()
export class WorkoutService {
  private readonly logger = new Logger(WorkoutService.name);

  constructor(private readonly kafkaService: KafkaService, @Inject(REQUEST) private readonly request: Request) {}

  /**
   * Logs a workout and publishes it to Kafka with correlation ID for traceability.
   * @param workoutLogDto - The workout log data transfer object.
   */
  async logWorkout(workoutLogDto: WorkoutLogDto): Promise<void> {
    const correlationId = this.request.headers["x-correlation-id"] as string;
    await this.kafkaService.publish("workout-logs", workoutLogDto, correlationId);
    this.logger.log("Workout log published to Kafka", { correlationId });
  }
}
