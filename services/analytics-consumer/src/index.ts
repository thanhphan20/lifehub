import { Kafka } from "kafkajs";
import { AnalyticsProcessor } from "./analytics-processor";
import * as dotenv from "dotenv";

dotenv.config();

const kafka = new Kafka({
  clientId: "analytics-consumer",
brokers: [process.env.KAFKA_BROKER || "localhost:29092"],
});

const consumer = kafka.consumer({ groupId: "analytics-group" });
const processor = new AnalyticsProcessor();

async function run() {
  await consumer.connect();
  console.log("✅ Connected to Kafka");

  // Subscribe to all event topics
  const topics = [
    "workout.created",
    "mood.created",
    "meal.logged",
    "todo.added",
    "todo.status.updated",
    "daily.summary.created",
    "book.created",
    "book.progress.updated",
    "reading.session.created",
    "skill.created",
    "skill.progress.updated",
    "self.test.created",
  ];

  await consumer.subscribe({ topics, fromBeginning: false });
  console.log(`✅ Subscribed to topics: ${topics.join(", ")}`);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const eventType = topic;
        const payload = JSON.parse(message.value?.toString() || "{}");

        console.log(`📊 Processing event: ${eventType}`, { partition, offset: message.offset });

        await processor.process(eventType, payload);
      } catch (error) {
        console.error(`❌ Error processing message from topic ${topic}:`, error);
      }
    },
  });
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await consumer.disconnect();
  await processor.disconnect();
  process.exit(0);
});
