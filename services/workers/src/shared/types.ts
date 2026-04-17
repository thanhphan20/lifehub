export enum EventDomain {
  NUTRITION = "nutrition",
  WORKOUT = "workout",
  ANALYTICS = "analytics",
  NOTION = "notion",
}

export enum EventType {
  RAW_INGEST = "raw.ingest",
  ENRICHED_LOGGED = "enriched.logged",
  SYNC_COMPLETED = "sync_completed",
  SYNC_FAILED = "sync_failed",
}

export interface LifeHubEvent {
  version: number;
  msgId: string;
  correlationId: string;
  timestamp: string;
  domain: EventDomain | string;
  type: EventType | string;
  data: any;
}

export interface EnrichedNutritionData {
  id: string;
  description: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: any[];
}

export interface EnrichedWorkoutData {
  id: string;
  type: string;
  sets: number;
  reps: number;
  weight: number;
  caloriesBurned?: number;
  userWeight?: number;
  duration?: number;
}
