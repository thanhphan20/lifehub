import { v4 as uuidv4 } from "uuid";
import { OutboxStatus } from "../../generated/client";

export class OutboxMessage {
  constructor(
    public readonly eventType: string,
    public readonly payload: any,
    public readonly id: string = uuidv4(),
    public status: OutboxStatus = OutboxStatus.PENDING,
    public retries: number = 0,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static fromDb(record: any): OutboxMessage {
    return new OutboxMessage(
      record.id,
      record.eventType,
      record.payload,
      record.status,
      record.retries,
      record.createdAt,
      record.updatedAt
    );
  }

  toPrisma() {
    return {
      id: this.id,
      eventType: this.eventType,
      payload: this.payload as any,
      status: this.status,
      retries: this.retries,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };
  }

  markSent() {
    this.status = OutboxStatus.SENT;
  }

  incrementRetries() {
    this.retries += 1;
    this.status = OutboxStatus.FAILED;
  }
}
