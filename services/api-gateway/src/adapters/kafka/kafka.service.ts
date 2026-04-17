import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Kafka, Producer, Message } from "kafkajs";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class KafkaService {
  private readonly logger = new Logger(KafkaService.name);
  private readonly kafka: Kafka;
  private producer: Producer | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const kafkaBroker = this.configService.get<string>("KAFKA_BROKER") || "localhost:9094";
    this.kafka = new Kafka({
      clientId: "api-gateway",
      brokers: [kafkaBroker],
    });
    this.logger.log(`KafkaService initialized with broker: ${kafkaBroker}`);
  }

  // ... (existing circuit breaker properties) ...

  /**
   * Subscribes to one or more topics.
   */
  async subscribe(groupId: string, topics: string[] | RegExp, onMessage: (payload: any) => Promise<void>) {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();

    if (Array.isArray(topics)) {
      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }
    } else {
      await consumer.subscribe({ topic: topics, fromBeginning: false });
    }

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const value = message.value?.toString();
        if (value) {
          try {
            const event = JSON.parse(value);
            await onMessage(event);
          } catch (err) {
            this.logger.error(`Error processing message from ${topic}: ${err}`);
          }
        }
      },
    });

    this.logger.log(`Subscribed to topics: ${topics} (group: ${groupId})`);
  }

  // Circuit breaker state
  private failureCount = 0;
  private readonly failureThreshold = 3;
  private circuitOpen = false;
  private circuitTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly openDuration = 30000; // 30 seconds

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer();
    }
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
    }
    return this.producer;
  }

  /**
   * Publishes a message to a Kafka topic with a correlation ID header for traceability.
   * @param topic - The Kafka topic to publish to.
   * @param message - The message payload.
   * @param correlationId - Optional correlation ID for tracing. If not provided, a new one is generated.
   */
  async publish(topic: string, message: any, correlationId?: string): Promise<void> {
    if (this.circuitOpen) {
      this.logger.error("Circuit breaker is OPEN. Rejecting publish request.");
      throw new Error("Kafka circuit breaker is open. Try again later.");
    }
    const producer = await this.getProducer();
    const cid = correlationId || uuidv4();
    const messageObj: Message = {
      value: JSON.stringify(message),
      headers: {
        "x-correlation-id": cid,
      },
    };
    try {
      await producer.send({ topic, messages: [messageObj] });
      this.logger.log(`Published message to ${topic}`, { correlationId: cid });
      this.failureCount = 0; // Reset on success
    } catch (err) {
      this.failureCount++;
      this.logger.error(`Failed to publish message to topic ${topic}: ${err}`);
      if (this.failureCount >= this.failureThreshold) {
        this.openCircuit();
      }
      throw err;
    }
  }

  private openCircuit() {
    if (!this.circuitOpen) {
      this.circuitOpen = true;
      this.logger.error("Kafka circuit breaker OPENED. Will reject publishes for 30 seconds.");
      this.circuitTimeout = setTimeout(() => {
        this.circuitOpen = false;
        this.failureCount = 0;
        this.logger.log("Kafka circuit breaker CLOSED. Resuming publishes.");
      }, this.openDuration);
    }
  }
}
