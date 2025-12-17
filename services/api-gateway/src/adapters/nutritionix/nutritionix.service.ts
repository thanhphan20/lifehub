import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

export interface NutritionSnapshot {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

@Injectable()
export class NutritionixService {
  private readonly appId: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService
  ) {
    this.appId = this.configService.get<string>("NUTRITIONIX_APP_ID", "");
    this.apiKey = this.configService.get<string>("NUTRITIONIX_API_KEY", "");
  }

  async analyze(description: string): Promise<NutritionSnapshot> {
    if (!this.appId || !this.apiKey) {
      throw new InternalServerErrorException("Nutritionix API credentials are not configured");
    }

    try {
      const response$ = this.http.post(
        "/natural/nutrients",
        { query: description },
        {
          headers: {
            "x-app-id": this.appId,
            "x-app-key": this.apiKey,
          },
        }
      );

      const { data } = await firstValueFrom(response$);

      if (!data || !Array.isArray(data.foods) || data.foods.length === 0) {
        throw new InternalServerErrorException("Nutritionix returned no foods for the given description");
      }

      const totals = data.foods.reduce(
        (acc: NutritionSnapshot, food: any) => {
          return {
            calories: acc.calories + (food.nf_calories || 0),
            protein: acc.protein + (food.nf_protein || 0),
            carbs: acc.carbs + (food.nf_total_carbohydrate || 0),
            fat: acc.fat + (food.nf_total_fat || 0),
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      return {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to analyze nutrition data");
    }
  }
}
