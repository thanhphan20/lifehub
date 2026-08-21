import { v4 as uuidv4 } from "uuid";
import { InboxStatus } from "../../generated/client";

export class InboxMessage {
  constructor(
    public readonly id: string = uuidv4(),
    public readonly msgId: string,
    public readonly eventType: string,
    public readonly payload: any,
    public status: InboxStatus = InboxStatus.PROCESSING,
    public retries: number = 0,
    public processedAt?: Date | null,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  static fromDb(record: any): InboxMessage {
    return new InboxMessage(
      record.id,
      record.msgId,
      record.eventType,
      record.payload,
      record.status,
      record.retries,
      record.processedAt,
      record.createdAt,
      record.updatedAt,
    );
  }

  toPrisma() {
    return {
      id: this.id,
      msgId: this.msgId,
      eventType: this.eventType,
      payload: this.payload as any,
      status: this.status,
      retries: this.retries,
      processedAt: this.processedAt ?? null,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };
  }
}
