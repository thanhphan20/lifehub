import { Injectable } from "@nestjs/common";
import { NutritionRepository } from "./nutrition.repository";
import { RedisService } from "../adapters/redis/redis.service";
import { CreateMealDto } from "./nutrition.dto";
import { NutritionixService } from "../adapters/nutritionix/nutritionix.service";
import { EventType, MealLoggedPayload } from "../application/messaging/events";

@Injectable()
export class NutritionService {
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly CACHE_KEY_PREFIX = "nutrition:";

  constructor(
    private readonly nutritionRepo: NutritionRepository,
    private readonly redisService: RedisService,
    private readonly nutritionix: NutritionixService
  ) {}

  async logMeal(dto: CreateMealDto, correlationId?: string) {
    const now = new Date();
    const date = dto.date ? new Date(dto.date) : now;

    const snapshot = await this.nutritionix.analyze(dto.description);

    const meal = await this.nutritionRepo.createWithOutbox(
      {
        description: dto.description,
        date,
        calories: snapshot.calories,
        protein: snapshot.protein,
        carbs: snapshot.carbs,
        fat: snapshot.fat,
      },
      {
        eventType: EventType.MEAL_LOGGED,
        payload: {
          id: "", // Placeholder, will be updated in transaction
          description: dto.description,
          date: date.toISOString().slice(0, 10),
          calories: snapshot.calories,
          protein: snapshot.protein,
          carbs: snapshot.carbs,
          fat: snapshot.fat,
          createdAt: new Date().toISOString(),
          correlationId,
        } as MealLoggedPayload,
      }
    );

    // Invalidate basic caches
    await this.redisService.del(`${this.CACHE_KEY_PREFIX}meals:${date.toISOString().slice(0, 10)}`);
    await this.redisService.del(`${this.CACHE_KEY_PREFIX}stats:week`);

    return meal;
  }

  async getMealsByDate(dateStr: string) {
    const date = new Date(dateStr);
    const key = `${this.CACHE_KEY_PREFIX}meals:${dateStr}`;

    const cached = await this.redisService.get(key);
    if (cached) {
      return cached;
    }

    const meals = await this.nutritionRepo.findByDate(date);
    await this.redisService.set(key, JSON.stringify(meals), this.CACHE_TTL_SECONDS);

    return meals;
  }

  async getStats(period: string = "week") {
    const now = new Date();
    let startDate: Date;

    switch (period.toLowerCase()) {
      case "day": {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case "week": {
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case "month": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case "year": {
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      }
      default: {
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
      }
    }

    const cacheKey = `${this.CACHE_KEY_PREFIX}stats:${period}:${startDate.toISOString().slice(0, 10)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await this.nutritionRepo.getStatsByPeriod(startDate, now);

    await this.redisService.set(cacheKey, JSON.stringify(stats), this.CACHE_TTL_SECONDS);

    return stats;
  }
}
