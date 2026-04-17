import Redis from "ioredis";

export class IdempotencyManager {
  private readonly defaultTtl = 86400; // 24 hours

  constructor(
    private readonly redis: Redis,
    private readonly serviceName: string,
  ) {}

  private get keyPrefix() {
    return `idempotency:${this.serviceName}:`;
  }

  async checkAndLock(messageId: string): Promise<boolean> {
    const key = `${this.keyPrefix}${messageId}`;
    const result = await this.redis.set(key, "processing", "EX", 60, "NX"); // 60s lock
    return result === "OK";
  }

  async markComplete(messageId: string): Promise<void> {
    const key = `${this.keyPrefix}${messageId}`;
    await this.redis.set(key, "completed", "EX", this.defaultTtl);
  }

  async isCompleted(messageId: string): Promise<boolean> {
    const key = `${this.keyPrefix}${messageId}`;
    const status = await this.redis.get(key);
    return status === "completed";
  }

  async releaseLock(messageId: string): Promise<void> {
    const key = `${this.keyPrefix}${messageId}`;
    const status = await this.redis.get(key);
    if (status === "processing") {
      await this.redis.del(key);
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  async setStatus(
    messageId: string,
    status: string,
    ttl: number = 86400,
  ): Promise<void> {
    const key = `${this.keyPrefix}${messageId}`;
    await this.redis.set(key, status, "EX", ttl);
  }
}
