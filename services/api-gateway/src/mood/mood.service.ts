import { Injectable } from "@nestjs/common";
import { MoodLogDto } from "./mood-log.dto";
import { MoodRepository } from "./mood.repository";
import { RedisService } from "../adapters/redis/redis.service";
import { EventType, MoodCreatedPayload } from "../application/messaging/events";

@Injectable()
export class MoodService {
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly CACHE_KEY_PREFIX = "mood:logs:";

  constructor(
    private readonly moodRepo: MoodRepository,
    private readonly redisService: RedisService
  ) {}

  /**
   * Logs a mood entry with outbox pattern for event streaming.
   * @param moodLogDto - The mood log data transfer object.
   * @param correlationId - Optional correlation ID from request headers.
   */
  async logMood(moodLogDto: MoodLogDto, correlationId?: string): Promise<{ id: string }> {
    const moodLog = await this.moodRepo.createWithOutbox(moodLogDto, {
      eventType: EventType.MOOD_CREATED,
      payload: {
        id: "", // Placeholder, will be updated in transaction
        rating: moodLogDto.rating,
        tags: moodLogDto.tags,
        notes: moodLogDto.notes,
        createdAt: new Date().toISOString(),
        correlationId,
      } as MoodCreatedPayload,
    });

    return { id: moodLog.id };
  }

  /**
   * Retrieves mood logs from database with pagination.
   */
  async getMoodLogs(page: number = 1, limit: number = 20) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}page:${page}:limit:${limit}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.moodRepo.findAllWithPagination(page, limit);

    await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * Retrieves a single mood log by ID.
   */
  async getMoodLogById(id: string) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const moodLog = await this.moodRepo.findById(id);

    if (moodLog) {
      await this.redisService.set(cacheKey, JSON.stringify(moodLog), this.CACHE_TTL_SECONDS);
    }

    return moodLog;
  }

  /**
   * Gets mood statistics for a given period.
   * Supports: day, week, month, year
   */
  async getMoodStats(period: string = "week") {
    const now = new Date();
    let startDate: Date;

    switch (period.toLowerCase()) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        // Default to week
        const defaultDayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - defaultDayOfWeek);
        startDate.setHours(0, 0, 0, 0);
    }

    const cacheKey = `${this.CACHE_KEY_PREFIX}stats:${period}:${startDate.toISOString()}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const stats = await this.moodRepo.getStatsByPeriod(startDate, now);

    await this.redisService.set(cacheKey, JSON.stringify(stats), this.CACHE_TTL_SECONDS);

    return stats;
  }
}
