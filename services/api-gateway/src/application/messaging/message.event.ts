export interface MessageEvent<T = any> {
  eventId: string;
  type: string;
  payload: T;
  createdAt: Date;
}
