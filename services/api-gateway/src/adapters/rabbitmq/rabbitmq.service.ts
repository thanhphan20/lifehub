import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqplib";
import { connect, Connection, Channel, ConfirmChannel } from "amqplib";

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: Connection | null = null;
  private publishChannel: ConfirmChannel | null = null;
  private consumerChannels: Map<string, Channel> = new Map();
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000;

  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<string>("ENABLE_RABBITMQ") === "true";
  }

  async onModuleInit() {
    if (this.isEnabled) {
      await this.connect();
    } else {
      this.logger.warn("RabbitMQ is disabled via ENABLE_RABBITMQ flag. All RabbitMQ operations will be no-ops.");
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    if (this.isConnecting || this.connection) {
      return;
    }

    this.isConnecting = true;

    try {
      const rabbitmqUrl = this.configService.get<string>(
        "RABBITMQ_URL",
        "amqp://lifehub:lifehub_password@localhost:5672",
      );
      //@ts-expect-error
      this.connection = await connect(rabbitmqUrl);
      this.reconnectAttempts = 0;
      this.logger.log("Successfully connected to RabbitMQ");

      // Setup event handlers
      //@ts-expect-error
      this.connection.on("error", (err) => {
        this.logger.error("RabbitMQ connection error", err);
      });

      //@ts-expect-error
      this.connection.on("close", () => {
        this.logger.warn("RabbitMQ connection closed, attempting to reconnect...");
        this.handleConnectionClose();
      });

      // Create a dedicated publish channel with confirms
      await this.createPublishChannel();
    } catch (error) {
      this.logger.error("Failed to connect to RabbitMQ", error);
      await this.scheduleReconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  private async createPublishChannel() {
    if (!this.connection) {
      throw new Error("RabbitMQ connection not established");
    }

    try {
      //@ts-expect-error
      this.publishChannel = await this.connection.createConfirmChannel();

      //@ts-expect-error
      this.publishChannel.on("error", (err) => {
        this.logger.error("Publish channel error", err);
        this.publishChannel = null;
      });

      //@ts-expect-error
      this.publishChannel.on("close", () => {
        this.logger.warn("Publish channel closed");
        this.publishChannel = null;
      });

      this.logger.log("Created publish channel with confirms");
    } catch (error) {
      this.logger.error("Failed to create publish channel", error);
      throw error;
    }
  }

  private async handleConnectionClose() {
    this.connection = null;
    this.publishChannel = null;
    this.consumerChannels.clear();
    await this.scheduleReconnect();
  }

  private async scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    this.logger.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private async disconnect() {
    // Close all consumer channels
    for (const [name, channel] of this.consumerChannels.entries()) {
      try {
        await channel.close();
        this.logger.log(`Closed consumer channel: ${name}`);
      } catch (error) {
        this.logger.error(`Error closing consumer channel ${name}`, error);
      }
    }
    this.consumerChannels.clear();

    // Close publish channel
    if (this.publishChannel) {
      try {
        await this.publishChannel.close();
        this.logger.log("Closed publish channel");
      } catch (error) {
        this.logger.error("Error closing publish channel", error);
      }
    }

    // Close connection
    if (this.connection) {
      try {
        //@ts-expect-error
        await this.connection.close();
        this.logger.log("Disconnected from RabbitMQ");
      } catch (error) {
        this.logger.error("Error closing RabbitMQ connection", error);
      }
    }
  }

  private async ensurePublishChannel(): Promise<ConfirmChannel> {
    if (!this.publishChannel) {
      if (!this.connection) {
        throw new Error("RabbitMQ connection not established");
      }
      await this.createPublishChannel();
    }

    if (!this.publishChannel) {
      throw new Error("Failed to create publish channel");
    }

    return this.publishChannel;
  }

  /**
   * Publishes a message to a RabbitMQ queue.
   * @param queue - The queue name to publish to.
   * @param message - The message payload.
   * @param options - Optional publish options.
   */
  async publish(queue: string, message: any, options?: amqp.Options.Publish): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug(`Skipping RabbitMQ publish to ${queue}: RabbitMQ is disabled`);
      return;
    }
    try {
      const channel = await this.ensurePublishChannel();
      await channel.assertQueue(queue, { durable: true });

      const messageBuffer = Buffer.from(JSON.stringify(message));

      // Use publisher confirms to ensure message delivery
      await new Promise<void>((resolve, reject) => {
        channel.sendToQueue(
          queue,
          messageBuffer,
          {
            persistent: true,
            ...options,
          },
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          },
        );
      });

      this.logger.log(`Published message to queue: ${queue}`);
    } catch (error) {
      this.logger.error(`Failed to publish message to queue ${queue}`, error);
      throw error;
    }
  }

  /**
   * Publishes a message to an exchange with routing key.
   * @param exchange - The exchange name.
   * @param routingKey - The routing key.
   * @param message - The message payload.
   * @param exchangeType - Exchange type (direct, topic, fanout, headers).
   */
  async publishToExchange(
    exchange: string,
    routingKey: string,
    message: any,
    exchangeType: "direct" | "topic" | "fanout" | "headers" = "topic",
  ): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug(`Skipping RabbitMQ publish to exchange ${exchange}: RabbitMQ is disabled`);
      return;
    }
    try {
      const channel = await this.ensurePublishChannel();
      await channel.assertExchange(exchange, exchangeType, { durable: true });

      const messageBuffer = Buffer.from(JSON.stringify(message));

      // Use publisher confirms
      await new Promise<void>((resolve, reject) => {
        channel.publish(exchange, routingKey, messageBuffer, { persistent: true }, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.logger.log(`Published message to exchange ${exchange} with routing key ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to publish message to exchange ${exchange}`, error);
      throw error;
    }
  }

  /**
   * Consumes messages from a queue with a handler function.
   * @param queue - The queue name to consume from.
   * @param handler - The handler function to process messages.
   * @param options - Consumer options.
   */
  async consume(
    queue: string,
    handler: (message: any) => Promise<void>,
    options?: {
      noAck?: boolean;
      prefetch?: number;
      deadLetterExchange?: string;
    },
  ): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn(`Skipping RabbitMQ consumption from ${queue}: RabbitMQ is disabled`);
      return;
    }
    if (!this.connection) {
      throw new Error("RabbitMQ connection not established");
    }

    try {
      const channelKey = `consumer-${queue}`;

      // Don't create duplicate consumers
      if (this.consumerChannels.has(channelKey)) {
        this.logger.warn(`Consumer for queue ${queue} already exists`);
        return;
      }

      //@ts-expect-error
      const channel = await this.connection.createChannel();
      this.consumerChannels.set(channelKey, channel);

      // Setup dead letter exchange if specified
      const queueOptions: amqp.Options.AssertQueue = {
        durable: true,
        ...(options?.deadLetterExchange && {
          deadLetterExchange: options.deadLetterExchange,
        }),
      };

      await channel.assertQueue(queue, queueOptions);

      if (options?.prefetch) {
        channel.prefetch(options.prefetch);
      }

      channel.on("error", (err: any) => {
        this.logger.error(`Consumer channel error for queue ${queue}`, err);
      });

      channel.on("close", () => {
        this.logger.warn(`Consumer channel closed for queue ${queue}`);
        this.consumerChannels.delete(channelKey);
      });

      await channel.consume(
        queue,
        async (msg: any) => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);

            if (!options?.noAck) {
              channel.ack(msg);
            }
          } catch (error) {
            this.logger.error(`Error processing message from queue ${queue}`, error);

            if (!options?.noAck) {
              // Don't requeue - send to DLX if configured, otherwise drop
              channel.nack(msg, false, true);
            }
          }
        },
        { noAck: options?.noAck || false },
      );

      this.logger.log(`Started consuming from queue: ${queue}`);
    } catch (error) {
      this.logger.error(`Failed to consume from queue ${queue}`, error);
      throw error;
    }
  }

  /**
   * Checks if the service is connected to RabbitMQ
   */
  isConnected(): boolean {
    return this.connection !== null && this.publishChannel !== null;
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(): Promise<void> {
    await this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }
}
