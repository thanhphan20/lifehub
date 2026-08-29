import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { KafkaPublisher } from "../src/adapters/kafka/kafka.publisher";
import { RabbitMQPublisher } from "../src/adapters/rabbitmq/rabbitmq.publisher";
import { RedisService } from "../src/adapters/redis/redis.service";
import { NutritionixService } from "../src/adapters/nutritionix/nutritionix.service";
import { OutboxProcessor } from "../src/application/outbox/outbox.processor";
import { MessagePublisher } from "../src/application/messaging/message-publisher.interface";
import { PrismaService } from "../src/prisma/prisma.service";

// Never contact real brokers regardless of .env (dotenv does not override existing env vars).
process.env.ENABLE_KAFKA = "false";
process.env.ENABLE_RABBITMQ = "false";

export interface RecordedPublish {
  topic: string;
  message: any;
  options?: { correlationId?: string };
}

const publishedEvents: RecordedPublish[] = [];

export const fakeMessagePublisher: MessagePublisher = {
  async publish(topic: string, message: any, options?: { correlationId?: string }): Promise<void> {
    publishedEvents.push({ topic, message, options });
  },
};

export function getPublishedEvents(): RecordedPublish[] {
  return publishedEvents;
}

export function clearPublishedEvents(): void {
  publishedEvents.length = 0;
}

export class InMemoryRedisService {
  private store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key);
    if (value === undefined) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: unknown, _ttlSeconds?: number): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  getClient(): null {
    return null;
  }

  clear(): void {
    this.store.clear();
  }
}

export const fakeRedis = new InMemoryRedisService();

export const fakeNutritionix = {
  analyze: async () => ({ calories: 500, protein: 20, carbs: 50, fat: 15 }),
};

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(KafkaPublisher)
    .useValue(fakeMessagePublisher)
    .overrideProvider(RabbitMQPublisher)
    .useValue(fakeMessagePublisher)
    .overrideProvider(RedisService)
    .useValue(fakeRedis)
    .overrideProvider(NutritionixService)
    .useValue(fakeNutritionix)
    .overrideProvider(OutboxProcessor)
    .useValue({ processPending: async () => {} })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.init();
  return app;
}

export async function clearTables(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "outbox" RESTART IDENTITY CASCADE`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "inbox" RESTART IDENTITY CASCADE`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "workout_logs" RESTART IDENTITY CASCADE`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "meal_logs" RESTART IDENTITY CASCADE`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "daily_entries" RESTART IDENTITY CASCADE`);
}

export function resetTestState(): void {
  clearPublishedEvents();
  fakeRedis.clear();
}

// Deterministically drain PENDING outbox rows through the fake publisher (the real
// OutboxProcessor cron is stubbed so tests never race a 5s scheduler).
export async function flushOutbox(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const pending = await prisma.outbox.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  for (const msg of pending) {
    const correlationId = (msg.payload as any)?.correlationId;
    await fakeMessagePublisher.publish(msg.eventType, msg.payload, { correlationId });
    await prisma.outbox.update({ where: { id: msg.id }, data: { status: "SENT" } });
  }
}