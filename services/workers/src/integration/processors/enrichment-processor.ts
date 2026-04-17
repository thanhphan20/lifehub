import { ApiNinjaService } from "../adapters/api-ninjas.service";
import { IdempotencyManager } from "../../shared/idempotency";
import {
  EventDomain,
  EventType,
  LifeHubEvent,
  EnrichedNutritionData,
  EnrichedWorkoutData,
} from "../../shared/types";
import { Producer } from "kafkajs";
import { v4 as uuidv4 } from "uuid";
import logger from "../../shared/logger";

export class EnrichmentProcessor {
  constructor(
    private readonly ninjaService: ApiNinjaService,
    private readonly idempotency: IdempotencyManager,
    private readonly producer: Producer,
  ) {}

  async handleEvent(event: LifeHubEvent) {
    const { msgId, correlationId, domain, data } = event;

    if (await this.idempotency.isCompleted(msgId)) {
      logger.info(`[Enrichment] Msg ${msgId} already completed. Skipping.`);
      return;
    }

    if (!(await this.idempotency.checkAndLock(msgId))) {
      logger.info(
        `[Enrichment] Msg ${msgId} is currently being processed. Skipping.`,
      );
      return;
    }

    try {
      logger.info(
        `[Enrichment] Processing ${domain} ingest for correlationId: ${correlationId}`,
      );

      let enrichedData: any;

      if (domain === EventDomain.NUTRITION) {
        enrichedData = await this.enrichNutrition(data);
      } else if (domain === EventDomain.WORKOUT) {
        enrichedData = await this.enrichWorkout(data);
      } else {
        logger.warn(`[Enrichment] Unsupported domain: ${domain}`);
        await this.idempotency.releaseLock(msgId);
        return;
      }

      const enrichedEvent: LifeHubEvent = {
        version: 1,
        msgId: uuidv4(),
        correlationId,
        timestamp: new Date().toISOString(),
        domain,
        type: EventType.ENRICHED_LOGGED,
        data: enrichedData,
      };

      await this.producer.send({
        topic: `v1.${domain}.${EventType.ENRICHED_LOGGED}`,
        messages: [{ value: JSON.stringify(enrichedEvent) }],
      });

      await this.idempotency.markComplete(msgId);
      logger.info(
        `[Enrichment] Successfully enriched and emitted for correlationId: ${correlationId}`,
      );
    } catch (error) {
      logger.error(`[Enrichment] Error processing msg ${msgId}:`, error);
      await this.idempotency.releaseLock(msgId);
      throw error;
    }
  }

  private async enrichNutrition(data: any): Promise<EnrichedNutritionData> {
    const rawText = data.rawText || data.description;

    const items = await this.ninjaService.withRetry(() =>
      this.ninjaService.getNutrition(rawText),
    );

    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein_g,
        carbs: acc.carbs + item.carbohydrates_total_g,
        fat: acc.fat + item.fat_total_g,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      id: data.id,
      description: data.description || items[0]?.name || "Unstructured Meal",
      date: data.date,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      items,
    };
  }

  private async enrichWorkout(data: any): Promise<EnrichedWorkoutData> {
    let caloriesBurned = data.caloriesBurned;

    if (!caloriesBurned) {
      const results = await this.ninjaService.withRetry(() =>
        this.ninjaService.getCaloriesBurned(
          data.type,
          data.userWeight || 160,
          data.duration || 60,
        ),
      );
      caloriesBurned = results[0]?.total_calories || 0;
    }

    return {
      ...data,
      caloriesBurned: Math.round(caloriesBurned),
    };
  }
}
