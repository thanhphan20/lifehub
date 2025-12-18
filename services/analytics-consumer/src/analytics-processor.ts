import { Pool } from "pg";
import Redis from "ioredis";
import { EventType } from "./types/events";

export class AnalyticsProcessor {
  private pgPool: Pool;
  private redis: Redis;

  constructor() {
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://lifehub:lifehub_password@localhost:5432/lifehub",
    });

    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    });
  }

  async process(eventType: string, payload: any) {
    switch (eventType) {
      case EventType.WORKOUT_CREATED:
        await this.processWorkoutCreated(payload);
        break;
      case EventType.MOOD_CREATED:
        await this.processMoodCreated(payload);
        break;
      case EventType.MEAL_LOGGED:
        await this.processMealLogged(payload);
        break;
      case EventType.TODO_ADDED:
      case EventType.TODO_STATUS_UPDATED:
        await this.processTodoEvent(payload);
        break;
      case EventType.DAILY_SUMMARY_CREATED:
        await this.processDailySummary(payload);
        break;
      case EventType.BOOK_CREATED:
      case EventType.BOOK_PROGRESS_UPDATED:
        await this.processBookEvent(payload);
        break;
      case EventType.READING_SESSION_CREATED:
        await this.processReadingSession(payload);
        break;
      case EventType.SKILL_CREATED:
      case EventType.SKILL_PROGRESS_UPDATED:
        await this.processSkillEvent(payload);
        break;
      case EventType.SELF_TEST_CREATED:
        await this.processSelfTest(payload);
        break;
      default:
        console.log(`⚠️  Unknown event type: ${eventType}`);
    }
  }

  private async processWorkoutCreated(payload: any) {
    const date = new Date(payload.createdAt).toISOString().slice(0, 10);
    const cacheKey = `analytics:daily:${date}:workouts`;

    await this.redis.incr(cacheKey);
    await this.redis.expire(cacheKey, 86400 * 7); // 7 days

    // Update weekly/monthly aggregates
    await this.updateTimeBasedAggregate("workouts", date, "week");
    await this.updateTimeBasedAggregate("workouts", date, "month");
  }

  private async processMoodCreated(payload: any) {
    const date = new Date(payload.createdAt).toISOString().slice(0, 10);
    const cacheKey = `analytics:daily:${date}:mood`;

    // Store mood rating for daily average calculation
    await this.redis.lpush(`${cacheKey}:ratings`, payload.rating);
    await this.redis.expire(`${cacheKey}:ratings`, 86400 * 7);

    // Update tag frequency
    if (payload.tags && Array.isArray(payload.tags)) {
      for (const tag of payload.tags) {
        await this.redis.hincrby(`${cacheKey}:tags`, tag, 1);
        await this.redis.expire(`${cacheKey}:tags`, 86400 * 7);
      }
    }
  }

  private async processMealLogged(payload: any) {
    const date = payload.date;
    const cacheKey = `analytics:daily:${date}:nutrition`;

    // Aggregate macros
    await this.redis.hincrbyfloat(`${cacheKey}:calories`, "total", payload.calories);
    await this.redis.hincrbyfloat(`${cacheKey}:protein`, "total", payload.protein);
    await this.redis.hincrbyfloat(`${cacheKey}:carbs`, "total", payload.carbs);
    await this.redis.hincrbyfloat(`${cacheKey}:fat`, "total", payload.fat);
    await this.redis.incr(`${cacheKey}:count`);

    // Set expiration
    await this.redis.expire(`${cacheKey}:calories`, 86400 * 7);
    await this.redis.expire(`${cacheKey}:protein`, 86400 * 7);
    await this.redis.expire(`${cacheKey}:carbs`, 86400 * 7);
    await this.redis.expire(`${cacheKey}:fat`, 86400 * 7);
    await this.redis.expire(`${cacheKey}:count`, 86400 * 7);
  }

  private async processTodoEvent(payload: any) {
    const date = payload.date;
    const cacheKey = `analytics:daily:${date}:todos`;

    if (payload.status === "done") {
      await this.redis.incr(`${cacheKey}:completed`);
    } else if (payload.status === "skipped") {
      await this.redis.incr(`${cacheKey}:skipped`);
    }

    await this.redis.expire(`${cacheKey}:completed`, 86400 * 7);
    await this.redis.expire(`${cacheKey}:skipped`, 86400 * 7);
  }

  private async processDailySummary(payload: any) {
    const date = payload.date;
    const cacheKey = `analytics:daily:${date}:summary`;

    await this.redis.set(`${cacheKey}:exists`, "1");
    await this.redis.expire(`${cacheKey}:exists`, 86400 * 7);
  }

  private async processBookEvent(payload: any) {
    const cacheKey = `analytics:books:${payload.status || "reading"}`;
    await this.redis.incr(cacheKey);
    await this.redis.expire(cacheKey, 86400 * 30); // 30 days
  }

  private async processReadingSession(payload: any) {
    const date = payload.date.slice(0, 10);
    const cacheKey = `analytics:daily:${date}:reading`;

    if (payload.minutes) {
      await this.redis.incrby(`${cacheKey}:minutes`, payload.minutes);
    }
    if (payload.pages) {
      await this.redis.incrby(`${cacheKey}:pages`, payload.pages);
    }

    await this.redis.expire(`${cacheKey}:minutes`, 86400 * 7);
    await this.redis.expire(`${cacheKey}:pages`, 86400 * 7);
  }

  private async processSkillEvent(payload: any) {
    const cacheKey = `analytics:skills:total`;
    await this.redis.incr(cacheKey);
    await this.redis.expire(cacheKey, 86400 * 30);
  }

  private async processSelfTest(payload: any) {
    const date = payload.date.slice(0, 10);
    const cacheKey = `analytics:daily:${date}:self-tests`;

    await this.redis.incr(cacheKey);
    if (payload.score !== undefined) {
      await this.redis.lpush(`${cacheKey}:scores`, payload.score);
      await this.redis.ltrim(`${cacheKey}:scores`, 0, 99); // Keep last 100
    }
    await this.redis.expire(cacheKey, 86400 * 7);
  }

  private async updateTimeBasedAggregate(metric: string, date: string, period: "week" | "month") {
    // This would update weekly/monthly aggregates in Redis or PostgreSQL
    // For now, we'll just cache daily metrics and aggregate on-demand
  }

  async disconnect() {
    await this.pgPool.end();
    await this.redis.quit();
  }
}
