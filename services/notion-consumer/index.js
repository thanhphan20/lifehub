require('dotenv').config();
const amqp = require('amqplib');
const { Client } = require('@notionhq/client');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN, timeoutMs: 5000 });
const databaseId = process.env.NOTION_DB_ID;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'notion-sync-queue';

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

async function createWorkoutEntry(data, correlationId) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: data.type } }] },
        Sets: { number: data.sets },
        Reps: { number: data.reps },
        Weight: { number: data.weight },
        Date: { date: { start: new Date().toISOString() } },
      },
    });
    logger.info('Created Notion entry', { id: response.id, data, correlationId });
  } catch (err) {
    logger.error('Failed to create Notion entry', { error: err.message, data, correlationId });
    writeDeadLetter({ value: JSON.stringify(data), error: err.message, correlationId });
    throw err;
  }
}

async function startWorker() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    logger.info(`Connected to RabbitMQ, listening on queue "${QUEUE_NAME}"`);

    channel.consume(
      QUEUE_NAME,
      async (msg) => {
        if (msg !== null) {
          const value = msg.content.toString();
          let correlationId = msg.properties.correlationId || uuidv4();
          let data;
          try {
            data = JSON.parse(value);
          } catch (err) {
            logger.warn('Malformed JSON in message', { value, correlationId });
            writeDeadLetter({ value, error: 'Malformed JSON', correlationId });
            channel.ack(msg);
            return;
          }

          try {
            await createWorkoutEntry(data, correlationId);
            channel.ack(msg); // success
          } catch (err) {
            logger.error('Failed to process Notion entry, requeueing', { error: err.message, correlationId });
            // Requeue message for retry
            channel.nack(msg, false, true);
          }
        }
      },
      { noAck: false }
    );

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, closing RabbitMQ connection...');
      await channel.close();
      await connection.close();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing RabbitMQ connection...');
      await channel.close();
      await connection.close();
      process.exit(0);
    });
  } catch (err) {
    logger.error('RabbitMQ worker failed to start', { error: err.message });
    process.exit(1);
  }
}

startWorker();
