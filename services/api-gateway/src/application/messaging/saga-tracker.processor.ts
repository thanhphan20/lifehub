import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { KafkaService } from "../../adapters/kafka/kafka.service";
import { NutritionRepository } from "../../nutrition/nutrition.repository";
import { WorkoutRepository } from "../../workout/workout.repository";
import { EventType, LifeHubEvent, EventDomain } from "./events";

@Injectable()
export class SagaTrackerProcessor implements OnModuleInit {
  private readonly logger = new Logger(SagaTrackerProcessor.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly nutritionRepo: NutritionRepository,
    private readonly workoutRepo: WorkoutRepository,
  ) {}

  async onModuleInit() {
    this.logger.log("SagaTrackerProcessor initialized. Subscribing to SAGA feedback events...");

    // Using a regex to listen for all enrichment and sync completion/failure events
    const sagaPattern = /v1\..*\.(enriched\.logged|sync_completed|sync_failed)/;

    await this.kafkaService.subscribe("saga-tracker-group", sagaPattern, async (event: LifeHubEvent) => {
      try {
        await this.handleEvent(event);
      } catch (err: any) {
        this.logger.error(`Error handling SAGA event: ${err.message}`, err.stack);
      }
    });
  }

  private async handleEvent(event: LifeHubEvent) {
    const { type, domain, data } = event;
    const { id } = data;

    if (!id) {
      this.logger.warn(`Received SAGA event without data.id: ${JSON.stringify(event)}`);
      return;
    }

    this.logger.log(`[SAGA] Received ${type} for ${domain}:${id}`);

    switch (type) {
      case EventType.ENRICHED_LOGGED:
        await this.handleEnriched(domain, id, data);
        break;
      case EventType.SYNC_COMPLETED:
      case EventType.SYNC_FAILED:
        await this.handleSyncFeedback(domain, id, type === EventType.SYNC_COMPLETED ? "DONE" : "FAILED", event);
        break;
      default:
        this.logger.debug(`Ignored event type: ${type}`);
    }
  }

  private async handleEnriched(domain: string, id: string, data: any) {
    if (domain === EventDomain.NUTRITION) {
      await this.nutritionRepo.update(id, {
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        description: data.description,
        enrichmentStatus: "COMPLETED",
      });
    } else if (domain === EventDomain.WORKOUT) {
      await this.workoutRepo.update(id, {
        enrichmentStatus: "COMPLETED",
        // Additional enriched fields could be added here
      });
    }
  }

  private async handleSyncFeedback(domain: string, id: string, status: string, event: LifeHubEvent) {
    // Extract which module sent the feedback from the event domain if it's broad
    // or we assume the data payload contains the source.
    // For now, we'll try to detect the source (notion, analytics) from the topic if possible,
    // or we use a convention in the event type like "v1.notion.sync_completed".

    // Let's assume the event domain for sync events is the service name (e.g. "notion")
    const source = event.domain;

    if (domain === EventDomain.NUTRITION) {
      const meal = await this.nutritionRepo.findById(id);
      if (meal) {
        const syncDetails = (meal.syncDetails as any) || {};
        syncDetails[source] = status;
        await this.nutritionRepo.update(id, { syncDetails });
      }
    } else if (domain === EventDomain.WORKOUT) {
      const workout = await this.workoutRepo.findById(id);
      if (workout) {
        const syncDetails = (workout.syncDetails as any) || {};
        syncDetails[source] = status;
        await this.workoutRepo.update(id, { syncDetails });
      }
    }
  }
}
