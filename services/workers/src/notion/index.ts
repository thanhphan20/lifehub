import amqp from "amqplib";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";
import { createConsumer, createProducer } from "../shared/kafka";
import { createWorkoutEntry, syncToNotionEnriched } from "./client";
import logger from "../shared/logger";
import { handleShutdown } from "../shared/shutdown";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const RABBIT_QUEUE = "workout.created";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

async function checkIdempotency(msgId: string) {
  const key = `idempotency:notion:${msgId}`;
  const result = await redis.set(key, "completed", "EX", 86400, "NX"); // 24h
  return result === "OK";
}

export async function startNotionWorker() {
  // 1. Setup Kafka
  const kafkaConsumer = createConsumer("notion-consumer-group");
  const kafkaProducer = createProducer();
  await kafkaConsumer.connect();
  await kafkaProducer.connect();
  await kafkaConsumer.subscribe({
    topics: [/v1\..*\.enriched\.logged/],
    fromBeginning: false,
  });
  logger.info("✅ Kafka consumer connected (Notion)");

  // 2. Setup RabbitMQ
  const rabbitConn = await amqp.connect(RABBITMQ_URL);
  const rabbitChannel = await rabbitConn.createChannel();
  await rabbitChannel.assertQueue(RABBIT_QUEUE, { durable: true });
  logger.info(`✅ RabbitMQ connected, listening on queue "${RABBIT_QUEUE}"`);

  // --- RabbitMQ Consumer Logic ---
  rabbitChannel.consume(RABBIT_QUEUE, async (msg) => {
    if (!msg) return;
    const value = msg.content.toString();
    const correlationId = msg.properties.correlationId || uuidv4();

    try {
      const data = JSON.parse(value);
      await createWorkoutEntry(data, correlationId);
      rabbitChannel.ack(msg);
    } catch (err: any) {
      logger.error("Failed to process RabbitMQ message", {
        error: err.message,
        correlationId,
      });
      // For simple MVP, we nack and requeue
      rabbitChannel.nack(msg, false, true);
    }
  });

  // --- Kafka Consumer Logic ---
  await kafkaConsumer.run({
    // @ts-ignore
    eachMessage: async ({ _topic, message }) => {
      const value = message.value?.toString();
      if (!value) return;

      const event = JSON.parse(value);
      const { msgId, correlationId } = event;

      if (!(await checkIdempotency(msgId))) {
        logger.info("Duplicate Kafka message detected, skipping", { msgId });
        return;
      }

      try {
        logger.info("Syncing Kafka event to Notion", {
          correlationId,
          domain: event.domain,
        });
        await syncToNotionEnriched(event);

        // Send ACK
        await kafkaProducer.send({
          topic: `v1.notion.sync_completed`,
          messages: [
            {
              value: JSON.stringify({
                version: 1,
                msgId: uuidv4(),
                correlationId,
                timestamp: new Date().toISOString(),
                domain: "notion",
                type: "sync_completed",
                data: { id: event.data.id },
              }),
            },
          ],
        });
      } catch (err: any) {
        logger.error("Failed to sync Kafka event to Notion", {
          error: err.message,
          correlationId,
        });
        await kafkaProducer.send({
          topic: `v1.notion.sync_failed`,
          messages: [
            {
              value: JSON.stringify({
                version: 1,
                msgId: uuidv4(),
                correlationId,
                timestamp: new Date().toISOString(),
                domain: "notion",
                type: "sync_failed",
                data: { id: event.data.id },
              }),
            },
          ],
        });
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
    {
      disconnect: async () => {
        await rabbitChannel.close();
        await rabbitConn.close();
      },
    },
  ]);
}
