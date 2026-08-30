import { randomUUID } from "crypto";
import { OutboxStatus } from "../../generated/client";

export class OutboxMessage {
  constructor(
    public readonly eventType: string,
    public readonly payload: any,
    public readonly id: string = randomUUID(),
    public status: OutboxStatus = OutboxStatus.PENDING,
    public retries: number = 0,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  static fromDb(record: any): OutboxMessage {
    return new OutboxMessage(
      record.eventType,
      record.payload,
      record.id,
      record.status,
      record.retries,
      record.createdAt,
      record.updatedAt,
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
}
