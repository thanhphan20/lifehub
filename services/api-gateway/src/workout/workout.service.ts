import { Injectable, Logger, Inject } from "@nestjs/common";
import { WorkoutLogDto } from "./workout-log.dto";
import { WorkoutRepository } from "./workout.repository";
import { MessagePublisher } from "../application/messaging/message-publisher.interface";
import { RedisService } from "../adapters/redis/redis.service";

@Injectable()
export class WorkoutService {
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly CACHE_KEY_PREFIX = "workout:logs:";

  constructor(
    private readonly workoutRepo: WorkoutRepository,
    @Inject("MessagePublishers") private readonly publisher: MessagePublisher,
    private readonly redisService: RedisService
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
    // Persist to Database (source of truth)
    const workoutLog = await this.workoutRepo.create(workoutLogDto);

    const logPayload = {
      id: workoutLog.id,
      ...workoutLogDto,
      correlationId: correlationId || undefined,
    };

    // Publish to message publisher
    await this.publisher.publish("workout-logs", logPayload, { correlationId });

    return { id: workoutLog.id };
  }

  /**
   * Retrieves workout logs from database.
   */
  async getWorkoutLogs(page: number = 1, limit: number = 20) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}page:${page}:limit:${limit}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.workoutRepo.findAllWithPagination(page, limit);

    await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * Retrieves a single workout log by ID.
   */
  async getWorkoutLogById(id: string) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const workoutLog = await this.workoutRepo.findById(id);

    if (workoutLog) {
      await this.redisService.set(cacheKey, JSON.stringify(workoutLog), this.CACHE_TTL_SECONDS);
    }

    return workoutLog;
  }
}
