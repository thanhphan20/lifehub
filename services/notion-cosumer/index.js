require('dotenv').config();
const { Kafka } = require('kafkajs');
const { Client } = require('@notionhq/client');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const kafka = new Kafka({
  clientId: 'notion-consumer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9094'],
});

const consumer = kafka.consumer({ groupId: 'notion-consumer-group' });
const notion = new Client({ auth: process.env.NOTION_TOKEN, timeoutMs: 5000 });
const databaseId = process.env.NOTION_DB_ID;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const DEAD_LETTER_PATH = path.join(__dirname, 'dead-letter.jsonl');

function writeDeadLetter({ value, error, correlationId }) {
  const entry = {
    value,
    error,
    correlationId,
    timestamp: new Date().toISOString(),
  };
  fs.appendFile(DEAD_LETTER_PATH, JSON.stringify(entry) + '\n', (err) => {
    if (err) {
      logger.error('Failed to write to dead letter file', { error: err.message });
    } else {
      logger.warn('Message written to dead letter file', { correlationId });
    }
  });
}

async function validateNotionSchema() {
  try {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const props = db.properties;
    const required = ['Name', 'Sets', 'Reps', 'Weight', 'Date'];
    const missing = required.filter((key) => !props[key]);
    if (missing.length > 0) {
      logger.error('Notion DB schema missing required properties', { missing });
      process.exit(1);
    }
    logger.info('Notion DB schema validated', { properties: Object.keys(props) });
  } catch (err) {
    if (err.code === 'RequestTimeout') {
      logger.error('Notion DB schema validation timed out', { error: err.message });
      writeDeadLetter({ value: 'Notion DB schema validation', error: 'Timeout', correlationId: null });
    } else {
      logger.error('Failed to validate Notion DB schema', { error: err.message });
    }
    process.exit(1);
  }
}

async function createWorkoutEntry(data, correlationId) {
  const maxRetries = 5;
  const delays = [500, 1000, 2000, 4000, 8000];
  let attempt = 0;
  // Idempotency: check for existing entry with same data and today's date
  const today = new Date().toISOString().split('T')[0];
  try {
    const query = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          { property: 'Name', title: { equals: data.type } },
          { property: 'Sets', number: { equals: data.sets } },
          { property: 'Reps', number: { equals: data.reps } },
          { property: 'Weight', number: { equals: data.weight } },
          { property: 'Date', date: { on_or_after: today, on_or_before: today } },
        ],
      },
    });
    if (query.results && query.results.length > 0) {
      logger.info('Duplicate workout entry detected, skipping creation', { data });
      return;
    }
  } catch (err) {
    if (err.code === 'RequestTimeout') {
      logger.error('Notion DB query timed out', { error: err.message, data, correlationId });
      writeDeadLetter({ value: JSON.stringify(data), error: 'Timeout', correlationId });
      return;
    }
    logger.error('Failed to check for duplicate entry', { error: err.message, data });
    // Continue to try creation anyway
  }
  while (attempt <= maxRetries) {
    try {
      const response = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ text: { content: data.type } }],
          },
          Sets: {
            number: data.sets,
          },
          Reps: {
            number: data.reps,
          },
          Weight: {
            number: data.weight,
          },
          Date: {
            date: { start: new Date().toISOString() },
          },
        },
      });
      logger.info('Created Notion entry', { id: response.id, data, correlationId });
      return;
    } catch (err) {
      if (err.code === 'RequestTimeout') {
        logger.error('Notion page creation timed out', { error: err.message, data, attempt: attempt + 1, correlationId });
        writeDeadLetter({ value: JSON.stringify(data), error: 'Timeout', correlationId });
        throw err;
      }
      if (err.status === 429 && attempt < maxRetries) {
        const delay = delays[Math.min(attempt, delays.length - 1)];
        logger.warn('Rate limited by Notion API, retrying', { attempt: attempt + 1, delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
        continue;
      }
      logger.error('Failed to create Notion entry', { error: err.message, data, attempt: attempt + 1, correlationId });
      throw err;
    }
  }
}

async function run() {
  await validateNotionSchema();
  await consumer.connect();
  await consumer.subscribe({ topic: 'workout-logs', fromBeginning: true });
  logger.info('Kafka consumer connected and subscribed to workout-logs');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const value = message.value.toString();
        let correlationId = null;
        if (message.headers && message.headers['x-correlation-id']) {
          correlationId = message.headers['x-correlation-id'].toString();
        } else {
          correlationId = uuidv4();
        }
        let data;
        try {
          data = JSON.parse(value);
        } catch (err) {
          logger.warn('Malformed JSON in message', { value, correlationId });
          writeDeadLetter({ value, error: 'Malformed JSON', correlationId });
          return;
        }
        if (!data.type || !data.sets || !data.reps || !data.weight) {
          logger.warn('Invalid workout log message received', { value, correlationId });
          writeDeadLetter({ value, error: 'Invalid schema', correlationId });
          return;
        }
        logger.info('Received workout log', { topic, partition, offset: message.offset, data, correlationId });
        try {
          await createWorkoutEntry(data, correlationId);
        } catch (err) {
          logger.error('Failed to process workout entry', { error: err.message, value, correlationId });
          writeDeadLetter({ value, error: err.message, correlationId });
        }
      } catch (err) {
        logger.error('Failed to process message', { error: err.message, value: message.value.toString(), correlationId });
        writeDeadLetter({ value: message.value.toString(), error: err.message, correlationId });
      }
    },
  });
}

run().catch((err) => {
  logger.error('Kafka consumer failed to start', { error: err.message });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, disconnecting consumer...');
  await consumer.disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, disconnecting consumer...');
  await consumer.disconnect();
  process.exit(0);
});
