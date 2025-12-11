export interface MessagePublisher {
  publish(topic: string, message: any, options?: { correlationId?: string }): Promise<void>;
}
