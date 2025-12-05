import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>("REDIS_HOST") || "localhost";
    const port = this.configService.get<number>("REDIS_PORT") || 6379;
    const password = this.configService.get<string>("REDIS_PASSWORD");

    this.client = new Redis({
      host,
      port,
      password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on("connect", () => {
      this.logger.log("Redis client connected");
    });

    this.client.on("error", (error) => {
      this.logger.error("Redis client error", error);
    });

    this.client.on("close", () => {
      this.logger.warn("Redis client connection closed");
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
      this.logger.log("Redis client disconnected");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      this.logger.warn("Redis client not initialized, returning null");
      return null;
    }
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get key ${key} from Redis`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      this.logger.warn("Redis client not initialized, skipping cache set");
      return;
    }
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Failed to set key ${key} in Redis`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) {
      this.logger.warn("Redis client not initialized, skipping cache delete");
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key} from Redis`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key} in Redis`, error);
      return false;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }
}
