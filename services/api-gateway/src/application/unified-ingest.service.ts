import { Injectable, Logger } from "@nestjs/common";
import { NutritionRepository } from "../nutrition/nutrition.repository";
import { WorkoutRepository } from "../workout/workout.repository";
import { randomUUID } from "crypto";

export interface UnifiedIngestDto {
  text?: string;
  structured?: {
    type: "nutrition" | "workout" | "mood";
    data: any;
  }[];
}

@Injectable()
export class UnifiedIngestService {
  private readonly logger = new Logger(UnifiedIngestService.name);

  constructor(
    private readonly nutritionRepo: NutritionRepository,
    private readonly workoutRepo: WorkoutRepository,
  ) {}

  async ingest(dto: UnifiedIngestDto) {
    const correlationId = randomUUID();
    this.logger.log(`[UnifiedIngest] Starting ingest with correlationId: ${correlationId}`);

    const results: any[] = [];

    // 1. Handle Natural Language (Enrichment Flow)
    if (dto.text) {
      // In a real system, we might use another Ninja API to "split" text into domains.
      // For now, we assume if it's text, it's a candidate for the enrichment worker.
      this.logger.log(`[UnifiedIngest] Handling NL text: "${dto.text}"`);

      // Emit a raw ingest event for the whole text
      // We'll create a skeletal record in the DB first if we can identify the domain,
      // or just emit the event if it's broad.
      // For this demo, let's assume raw text goes to Nutrition as the primary NLP target.
      const meal = await this.nutritionRepo.createWithOutbox(
        { description: "Unprocessed Ingest", date: new Date(), rawText: dto.text },
        {
          eventType: `v1.nutrition.raw.ingest`,
          payload: {
            version: 1,
            msgId: randomUUID(),
            correlationId,
            timestamp: new Date().toISOString(),
            domain: "nutrition",
            type: "raw.ingest",
            data: { rawText: dto.text },
          },
        },
      );
      results.push({ type: "nutrition-nlp", id: meal.id });
    }

    // 2. Handle Structured Data (Source of Truth Flow)
    if (dto.structured) {
      for (const item of dto.structured) {
        if (item.type === "nutrition") {
          const meal = await this.nutritionRepo.createWithOutbox(item.data, {
            eventType: `v1.nutrition.enriched.logged`, // Skip worker if already structured
            payload: {
              version: 1,
              msgId: randomUUID(),
              correlationId,
              timestamp: new Date().toISOString(),
              domain: "nutrition",
              type: "enriched.logged",
              data: item.data,
            },
          });
          results.push({ type: "nutrition-structured", id: meal.id });
        } else if (item.type === "workout") {
          const workout = await this.workoutRepo.createWithOutbox(item.data, {
            eventType: `v1.workout.enriched.logged`,
            payload: {
              version: 1,
              msgId: randomUUID(),
              correlationId,
              timestamp: new Date().toISOString(),
              domain: "workout",
              type: "enriched.logged",
              data: item.data,
            },
          });
          results.push({ type: "workout-structured", id: workout.id });
        }
      }
    }

    return {
      correlationId,
      results,
    };
  }
}
