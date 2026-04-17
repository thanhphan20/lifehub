import { createConsumer, createProducer } from "../shared/kafka";
import { AnalyticsProcessor } from "./processor";
import logger from "../shared/logger";
import { handleShutdown } from "../shared/shutdown";

export async function startAnalyticsWorker() {
  const consumer = createConsumer("analytics-group");
  const producer = createProducer();
  const processor = new AnalyticsProcessor(producer);

  await consumer.connect();
  await producer.connect();
  logger.info("✅ Kafka connected (Analytics Worker)");

  const legacyTopics = [
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

  const sagaPattern = /v1\..*\.enriched\.logged/;

  await consumer.subscribe({ topics: legacyTopics, fromBeginning: false });
  await consumer.subscribe({ topic: sagaPattern, fromBeginning: false });

  logger.info(`✅ Subscribed to legacy topics and V1 SAGA pattern`);

  await consumer.run({
    // @ts-ignore
    eachMessage: async ({ topic, _partition, message }) => {
      try {
        const value = message.value?.toString();
        if (!value) return;

        const payload = JSON.parse(value);
        logger.debug(`📊 Processing event from topic: ${topic}`, {
          offset: message.offset,
        });

        await processor.process(topic, payload);
      } catch (error) {
        logger.error(`❌ Error processing message from topic ${topic}:`, error);
      }
    },
  });

  handleShutdown([consumer, producer, processor]);
}
