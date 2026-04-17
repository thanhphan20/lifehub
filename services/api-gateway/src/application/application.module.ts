import { Module } from "@nestjs/common";
import { UnifiedIngestService } from "./unified-ingest.service";
import { UnifiedIngestController } from "./unified-ingest.controller";
import { NutritionModule } from "../nutrition/nutrition.module";
import { WorkoutModule } from "../workout/workout.module";

@Module({
  imports: [NutritionModule, WorkoutModule],
  controllers: [UnifiedIngestController],
  providers: [UnifiedIngestService],
  exports: [UnifiedIngestService],
})
export class ApplicationModule {}
