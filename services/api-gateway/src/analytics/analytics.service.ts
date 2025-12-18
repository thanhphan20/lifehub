import { Injectable } from "@nestjs/common";
import { RedisService } from "../adapters/redis/redis.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly redisService: RedisService) {}

  async getDailySummary(dateStr?: string) {
    const date = dateStr || new Date().toISOString().slice(0, 10);
    const cacheKey = `analytics:daily:${date}`;

    const [
      workouts,
      moodRatings,
      moodTags,
      nutritionCalories,
      nutritionProtein,
      nutritionCarbs,
      nutritionFat,
      mealCount,
      todosCompleted,
      todosSkipped,
      hasSummary,
      readingMinutes,
      readingPages,
      selfTests,
    ] = await Promise.all([
      this.redisService.get(`${cacheKey}:workouts`),
      this.redisService.get(`${cacheKey}:mood:ratings`),
      this.redisService.get(`${cacheKey}:mood:tags`),
      this.redisService.get(`${cacheKey}:nutrition:calories`),
      this.redisService.get(`${cacheKey}:nutrition:protein`),
      this.redisService.get(`${cacheKey}:nutrition:carbs`),
      this.redisService.get(`${cacheKey}:nutrition:fat`),
      this.redisService.get(`${cacheKey}:nutrition:count`),
      this.redisService.get(`${cacheKey}:todos:completed`),
      this.redisService.get(`${cacheKey}:todos:skipped`),
      this.redisService.get(`${cacheKey}:summary:exists`),
      this.redisService.get(`${cacheKey}:reading:minutes`),
      this.redisService.get(`${cacheKey}:reading:pages`),
      this.redisService.get(`${cacheKey}:self-tests`),
    ]);

    const moodAverage =
      Array.isArray(moodRatings) && moodRatings.length > 0
        ? moodRatings.reduce((sum, r) => sum + Number(r), 0) / moodRatings.length
        : null;

    return {
      date,
      workouts: Number(workouts) || 0,
      mood: {
        average: moodAverage ? Math.round(moodAverage * 100) / 100 : null,
        tagFrequency: moodTags || {},
        count: Array.isArray(moodRatings) ? moodRatings.length : 0,
      },
      nutrition: {
        calories: Number(nutritionCalories) || 0,
        protein: Number(nutritionProtein) || 0,
        carbs: Number(nutritionCarbs) || 0,
        fat: Number(nutritionFat) || 0,
        mealCount: Number(mealCount) || 0,
      },
      todos: {
        completed: Number(todosCompleted) || 0,
        skipped: Number(todosSkipped) || 0,
      },
      reading: {
        minutes: Number(readingMinutes) || 0,
        pages: Number(readingPages) || 0,
      },
      learning: {
        selfTests: Number(selfTests) || 0,
      },
      hasSummary: hasSummary === "1",
    };
  }

  async getWeeklySummary(weekStr?: string) {
    // Calculate week start date
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const summaries = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      summaries.push(await this.getDailySummary(dateStr));
    }

    // Aggregate weekly totals
    const weekly = summaries.reduce(
      (acc, day) => {
        return {
          workouts: acc.workouts + day.workouts,
          moodCount: acc.moodCount + day.mood.count,
          moodSum: acc.moodSum + (day.mood.average || 0) * day.mood.count,
          calories: acc.calories + day.nutrition.calories,
          protein: acc.protein + day.nutrition.protein,
          carbs: acc.carbs + day.nutrition.carbs,
          fat: acc.fat + day.nutrition.fat,
          mealCount: acc.mealCount + day.nutrition.mealCount,
          todosCompleted: acc.todosCompleted + day.todos.completed,
          todosSkipped: acc.todosSkipped + day.todos.skipped,
          readingMinutes: acc.readingMinutes + day.reading.minutes,
          readingPages: acc.readingPages + day.reading.pages,
          selfTests: acc.selfTests + day.learning.selfTests,
          daysWithSummary: acc.daysWithSummary + (day.hasSummary ? 1 : 0),
        };
      },
      {
        workouts: 0,
        moodCount: 0,
        moodSum: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealCount: 0,
        todosCompleted: 0,
        todosSkipped: 0,
        readingMinutes: 0,
        readingPages: 0,
        selfTests: 0,
        daysWithSummary: 0,
      }
    );

    return {
      week: this.getWeekString(weekStart),
      startDate: weekStart.toISOString().slice(0, 10),
      endDate: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      totals: {
        workouts: weekly.workouts,
        mood: {
          average: weekly.moodCount > 0 ? Math.round((weekly.moodSum / weekly.moodCount) * 100) / 100 : null,
          count: weekly.moodCount,
        },
        nutrition: {
          calories: Math.round(weekly.calories),
          protein: Math.round(weekly.protein * 10) / 10,
          carbs: Math.round(weekly.carbs * 10) / 10,
          fat: Math.round(weekly.fat * 10) / 10,
          mealCount: weekly.mealCount,
        },
        todos: {
          completed: weekly.todosCompleted,
          skipped: weekly.todosSkipped,
          completionRate:
            weekly.todosCompleted + weekly.todosSkipped > 0
              ? Math.round((weekly.todosCompleted / (weekly.todosCompleted + weekly.todosSkipped)) * 100)
              : 0,
        },
        reading: {
          minutes: weekly.readingMinutes,
          pages: weekly.readingPages,
        },
        learning: {
          selfTests: weekly.selfTests,
        },
        daysWithSummary: weekly.daysWithSummary,
      },
      daily: summaries,
    };
  }

  async getCorrelations(period: string = "week") {
    // This would analyze correlations between metrics
    // For now, return a placeholder structure
    return {
      period,
      correlations: {
        moodVsProductivity: null,
        nutritionVsWorkouts: null,
        readingVsMood: null,
      },
      message: "Correlation analysis coming soon",
    };
  }

  private getWeekString(date: Date): string {
    const year = date.getFullYear();
    const start = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + start.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, "0")}`;
  }
}
