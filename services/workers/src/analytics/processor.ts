import { Pool } from "pg";
import Redis from "ioredis";
import { Producer } from "kafkajs";
import { v4 as uuidv4 } from "uuid";
import logger from "../shared/logger";

export enum EventType {
  WORKOUT_CREATED = "workout.created",
  MOOD_CREATED = "mood.created",
  MEAL_LOGGED = "meal.logged",
  TODO_ADDED = "todo.added",
  TODO_STATUS_UPDATED = "todo.status.updated",
  DAILY_SUMMARY_CREATED = "daily.summary.created",
  BOOK_CREATED = "book.created",
  BOOK_PROGRESS_UPDATED = "book.progress.updated",
  READING_SESSION_CREATED = "reading.session.created",
  SKILL_CREATED = "skill.created",
  SKILL_PROGRESS_UPDATED = "skill.progress.updated",
  SELF_TEST_CREATED = "self.test.created",
}

export class AnalyticsProcessor {
  private pgPool: Pool;
  private redis: Redis;
  private producer: Producer | null = null;

  constructor(producer?: Producer) {
    this.pgPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://lifehub:lifehub_password@localhost:5432/lifehub",
    });

    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    });

    if (producer) {
      this.producer = producer;
    }
  }

  async process(topic: string, payload: any) {
    // Handle V1 SAGA Event
    if (payload.version === 1 && payload.type === "enriched.logged") {
      await this.handleV1Event(payload);
      return;
    }

    // Handle Legacy Events (topic often matches EventType)
    switch (topic) {
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
        logger.warn(`⚠️  Unknown event type or topic: ${topic}`);
    }
  }

  private async processWorkoutCreated(payload: any) {
    const date = new Date(payload.createdAt).toISOString().slice(0, 10);
    const cacheKey = `analytics:daily:${date}:workouts`;

    await this.redis.incr(cacheKey);
    await this.redis.expire(cacheKey, 86400 * 7); // 7 days
    logger.debug(`📊 [Analytics] Incremented workouts for ${date}`);
  }

  private async processMoodCreated(payload: any) {
    const date = new Date(payload.createdAt).toISOString().slice(0, 10);
    const cacheKey = `analytics:daily:${date}:mood`;

    await this.redis.lpush(`${cacheKey}:ratings`, payload.rating);
    await this.redis.expire(`${cacheKey}:ratings`, 86400 * 7);

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

    await this.redis.hincrbyfloat(
      `${cacheKey}:calories`,
      "total",
      payload.calories,
    );
    await this.redis.hincrbyfloat(
      `${cacheKey}:protein`,
      "total",
      payload.protein,
    );
    await this.redis.hincrbyfloat(`${cacheKey}:carbs`, "total", payload.carbs);
    await this.redis.hincrbyfloat(`${cacheKey}:fat`, "total", payload.fat);
    await this.redis.incr(`${cacheKey}:count`);

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
    await this.redis.expire(cacheKey, 86400 * 30);
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

  private async processSkillEvent(_payload: any) {
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
      await this.redis.ltrim(`${cacheKey}:scores`, 0, 99);
    }
    await this.redis.expire(cacheKey, 86400 * 7);
  }

  async disconnect() {
    await this.pgPool.end();
    await this.redis.quit();
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  private async handleV1Event(event: any) {
    const { msgId, correlationId, domain, data } = event;
    const idempKey = `idempotency:analytics:${msgId}`;

    const result = await this.redis.set(
      idempKey,
      "completed",
      "EX",
      86400,
      "NX",
    ); // 24h
    if (result !== "OK") {
      logger.info(`📊 [Analytics] Msg ${msgId} already processed. Skipping.`);
      return;
    }

    try {
      logger.info(
        `📊 [Analytics] Processing V1 ${domain} event: ${correlationId}`,
      );
      if (domain === "nutrition") {
        await this.processMealLogged(data);
      } else if (domain === "workout") {
        await this.processWorkoutCreated(data);
      }
      await this.sendAck(event, "sync_completed");
    } catch (err) {
      logger.error(`📊 [Analytics] Failed to process V1 event:`, err);
      await this.redis.del(idempKey);
      await this.sendAck(event, "sync_failed");
      throw err;
    }
  }

  private async updateTimeBasedAggregate(
    _metric: string,
    _date: string,
    _period: "week" | "month",
  ) {}

  private async sendAck(event: any, type: string) {
    if (!this.producer) return;
    const ackEvent = {
      version: 1,
      msgId: uuidv4(),
      correlationId: event.correlationId,
      timestamp: new Date().toISOString(),
      domain: "analytics",
      type: type,
      data: { id: event.data.id },
    };
    await this.producer.send({
      topic: `v1.analytics.${type}`,
      messages: [{ value: JSON.stringify(ackEvent) }],
    });
  }
}
