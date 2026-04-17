import Redis from "ioredis";
import { createConsumer, createProducer } from "../shared/kafka";
import { IdempotencyManager } from "../shared/idempotency";
import { ApiNinjaService } from "./adapters/api-ninjas.service";
import { EnrichmentProcessor } from "./processors/enrichment-processor";
import logger from "../shared/logger";
import { handleShutdown } from "../shared/shutdown";

export async function startIntegrationWorker() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  });

  const kafkaConsumer = createConsumer("integration-group");
  const kafkaProducer = createProducer();

  const ninjaService = new ApiNinjaService(process.env.NINJA_API_KEY || "");
  const idempotency = new IdempotencyManager(redis, "integration");

  await kafkaConsumer.connect();
  await kafkaProducer.connect();
  logger.info("✅ Kafka connected (Integration Worker)");

  const topics = [/v1\..*\.raw\.ingest/];
  await kafkaConsumer.subscribe({ topics });

  await kafkaConsumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const value = message.value?.toString();
        if (!value) return;

        const event = JSON.parse(value);
        const processor = new EnrichmentProcessor(
          ninjaService,
          idempotency,
          kafkaProducer,
        );

        await processor.handleEvent(event);
      } catch (error) {
        logger.error(
          `[Fatal] Error in consumer loop for topic ${topic}:`,
          error,
        );
      }
    },
  });

  handleShutdown([
    {
      disconnect: () => {
        kafkaConsumer.disconnect();
      },
    },
    {
      disconnect: () => {
        kafkaProducer.disconnect();
      },
    },
    {
      disconnect: async () => {
        await redis.quit();
      },
    },
  ]);
}
