import { Injectable } from "@nestjs/common";
import { WorkoutLogDto } from "./workout-log.dto";
import { WorkoutRepository } from "./workout.repository";
import { RedisService } from "../adapters/redis/redis.service";

@Injectable()
export class WorkoutService {
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly CACHE_KEY_PREFIX = "workout:logs:";

  constructor(
    private readonly workoutRepo: WorkoutRepository,
    private readonly redisService: RedisService
  ) {}

  /**
   * Logs a workout with hybrid outbox pattern for immediate delivery + reliability:
   * - PostgreSQL: Atomic transaction saves workout + outbox message together
   * - Immediate Publish: Tries to publish right away for fast delivery
   * - Fallback: If publish fails, OutboxProcessor cron job will retry later
   * - Publishers: Kafka (event streaming) + RabbitMQ (reliable task processing)
   *
   * @param workoutLogDto - The workout log data transfer object.
   * @param correlationId - Optional correlation ID from request headers.
   */
  async logWorkout(workoutLogDto: WorkoutLogDto, correlationId?: string): Promise<{ id: string }> {
    // Persist to Database (source of truth)
    const workoutLog = await this.workoutRepo.createWithOutbox(workoutLogDto, {
      eventType: "workout.created",
      payload: {
        ...workoutLogDto,
        correlationId,
      },
    });
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

  /**
   * Retrieves workout statistics for a given period.
   * Supports: day, week, month, year (defaults to week).
   */
  async getWorkoutStats(period: string = "week") {
    const now = new Date();
    let startDate: Date;

    switch (period.toLowerCase()) {
      case "day": {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case "week": {
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case "month": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case "year": {
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      }
      default: {
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
      }
    }

    const cacheKey = `${this.CACHE_KEY_PREFIX}stats:${period}:${startDate.toISOString().slice(0, 10)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await this.workoutRepo.getStatsByPeriod(startDate, now);
    await this.redisService.set(cacheKey, JSON.stringify(stats), this.CACHE_TTL_SECONDS);
    return stats;
  }
}
