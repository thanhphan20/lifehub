import axios, { AxiosInstance } from "axios";

export interface NutritionData {
  name: string;
  calories: number;
  protein_g: number;
  fat_total_g: number;
  carbohydrates_total_g: number;
  serving_size_g: number;
}

export interface CaloriesBurnedData {
  name: string;
  calories_per_hour: number;
  duration_minutes: number;
  total_calories: number;
}

export class ApiNinjaService {
  private readonly client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: "https://api.api-ninjas.com/v1",
      headers: { "X-Api-Key": apiKey },
      timeout: 30000,
    });
  }

  async getNutrition(query: string): Promise<NutritionData[]> {
    const response = await this.client.get<NutritionData[]>("/nutrition", {
      params: { query },
    });
    return response.data;
  }

  async getCaloriesBurned(
    activity: string,
    weight?: number,
    duration?: number,
  ): Promise<CaloriesBurnedData[]> {
    const response = await this.client.get<CaloriesBurnedData[]>(
      "/caloriesburned",
      {
        params: { activity, weight, duration },
      },
    );
    return response.data;
  }

  async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (i < retries - 1) {
          const delay = Math.pow(2, i) * 1000;
          await new Promise((res) => setTimeout(res, delay));
        }
      }
    }
    throw lastError;
  }
}
