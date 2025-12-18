// Event type definitions for all domains
export enum EventType {
  // Workout events
  WORKOUT_CREATED = "workout.created",
  WORKOUT_UPDATED = "workout.updated",

  // Mood events
  MOOD_CREATED = "mood.created",

  // Nutrition events
  MEAL_LOGGED = "meal.logged",

  // Daily events
  TODO_ADDED = "todo.added",
  TODO_STATUS_UPDATED = "todo.status.updated",
  DAILY_SUMMARY_CREATED = "daily.summary.created",

  // Reading events
  BOOK_CREATED = "book.created",
  BOOK_PROGRESS_UPDATED = "book.progress.updated",
  BOOK_RATED = "book.rated",
  READING_SESSION_CREATED = "reading.session.created",

  // Learning events
  SKILL_CREATED = "skill.created",
  SKILL_PROGRESS_UPDATED = "skill.progress.updated",
  SELF_TEST_CREATED = "self.test.created",
}

// Event payload interfaces
export interface WorkoutCreatedPayload {
  id: string;
  type: string;
  sets: number;
  reps: number;
  weight: number;
  createdAt: string;
  correlationId?: string;
}

export interface MoodCreatedPayload {
  id: string;
  rating: number;
  tags?: string[];
  notes?: string;
  createdAt: string;
  correlationId?: string;
}

export interface MealLoggedPayload {
  id: string;
  description: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
  correlationId?: string;
}

export interface TodoAddedPayload {
  todoId: string;
  date: string;
  text: string;
  status: string;
  correlationId?: string;
}

export interface TodoStatusUpdatedPayload {
  todoId: string;
  date: string;
  status: string;
  correlationId?: string;
}

export interface DailySummaryCreatedPayload {
  date: string;
  summary: string;
  correlationId?: string;
}

export interface BookCreatedPayload {
  id: string;
  title: string;
  author?: string;
  status: string;
  progress: number;
  createdAt: string;
  correlationId?: string;
}

export interface BookProgressUpdatedPayload {
  id: string;
  progress: number;
  status?: string;
  correlationId?: string;
}

export interface BookRatedPayload {
  id: string;
  rating: number;
  correlationId?: string;
}

export interface ReadingSessionCreatedPayload {
  id: string;
  bookId: string;
  pages?: number;
  minutes?: number;
  date: string;
  correlationId?: string;
}

export interface SkillCreatedPayload {
  id: string;
  name: string;
  proficiency: number;
  createdAt: string;
  correlationId?: string;
}

export interface SkillProgressUpdatedPayload {
  id: string;
  proficiency: number;
  correlationId?: string;
}

export interface SelfTestCreatedPayload {
  id: string;
  skillId: string;
  score?: number;
  date: string;
  correlationId?: string;
}
