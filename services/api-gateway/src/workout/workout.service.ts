import { Injectable, Logger } from "@nestjs/common";
import { WorkoutLogDto } from "./workout-log.dto";
import { KafkaService } from "../kafka/kafka.service";

@Injectable()
export class WorkoutService {
  private readonly logger = new Logger(WorkoutService.name);

  constructor(private readonly kafkaService: KafkaService) {}

  /**
   * Logs a workout and publishes it to Kafka with correlation ID for traceability.
   * @param workoutLogDto - The workout log data transfer object.
   * @param correlationId - Optional correlation ID from request headers.
   */
  async logWorkout(workoutLogDto: WorkoutLogDto, correlationId?: string): Promise<void> {
    await this.kafkaService.publish("workout-logs", workoutLogDto, correlationId);
    this.logger.log("Workout log published to Kafka", { correlationId: correlationId || "none" });
  }
}
