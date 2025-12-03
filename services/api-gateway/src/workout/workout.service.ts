import { Injectable, Logger } from "@nestjs/common";
import { WorkoutLogDto } from "./workout-log.dto";
import { KafkaService } from "../kafka/kafka.service";
import { RabbitMQService } from "../rabbitmq/rabbitmq.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkoutService {
  private readonly logger = new Logger(WorkoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaService: KafkaService,
    private readonly rabbitMQService: RabbitMQService
  ) {}

  /**
   * Logs a workout with dual message broker strategy:
   * - Kafka: For event streaming and long-term event sourcing (high throughput, event logs)
   * - RabbitMQ: For reliable task processing and retries (durable queues, guaranteed delivery)
   * - PostgreSQL: For immediate persistence and querying (source of truth)
   *
   * @param workoutLogDto - The workout log data transfer object.
   * @param correlationId - Optional correlation ID from request headers.
   */
  async logWorkout(workoutLogDto: WorkoutLogDto, correlationId?: string): Promise<{ id: string }> {
    // 1. Persist to PostgreSQL (source of truth)
    const workoutLog = await this.prisma.workoutLog.create({
      data: {
        type: workoutLogDto.type,
        sets: workoutLogDto.sets,
        reps: workoutLogDto.reps,
        weight: workoutLogDto.weight,
      },
    });

    const logPayload = {
      id: workoutLog.id,
      ...workoutLogDto,
      correlationId: correlationId || undefined,
      createdAt: workoutLog.createdAt.toISOString(),
    };

    // 2. Publish to Kafka (event streaming - for analytics, indexing, multiple consumers)
    try {
      await this.kafkaService.publish("workout-logs", logPayload, correlationId);
      this.logger.log("Workout log published to Kafka", {
        id: workoutLog.id,
        correlationId: correlationId || "none",
      });
    } catch (error) {
      this.logger.error("Failed to publish to Kafka (non-blocking)", error);
      // Don't throw - Kafka is for event streaming, not critical for basic functionality
    }

    // 3. Publish to RabbitMQ (reliable task processing - for Notion sync with retries)
    try {
      await this.rabbitMQService.publish("notion-sync-queue", {
        workoutLogId: workoutLog.id,
        ...workoutLogDto,
        correlationId: correlationId || undefined,
      });
      this.logger.log("Workout log published to RabbitMQ for Notion sync", {
        id: workoutLog.id,
        correlationId: correlationId || "none",
      });
    } catch (error) {
      this.logger.error("Failed to publish to RabbitMQ", error);
      throw error; // RabbitMQ is critical for Notion sync, so we throw
    }

    return { id: workoutLog.id };
  }

  /**
   * Retrieves workout logs from database.
   */
  async getWorkoutLogs(limit: number = 10, offset: number = 0) {
    const [logs, total] = await Promise.all([
      this.prisma.workoutLog.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.workoutLog.count(),
    ]);

    return {
      data: logs,
      total,
      limit,
      offset,
    };
  }

  /**
   * Retrieves a single workout log by ID.
   */
  async getWorkoutLogById(id: string) {
    return this.prisma.workoutLog.findUnique({
      where: { id },
    });
  }
}
