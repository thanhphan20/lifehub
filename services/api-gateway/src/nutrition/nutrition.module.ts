import { Module } from "@nestjs/common";
import { NutritionController } from "./nutrition.controller";
import { NutritionService } from "./nutrition.service";
import { NutritionRepository } from "./nutrition.repository";
import { NutritionixModule } from "../adapters/nutritionix/nutritionix.module";

@Module({
  imports: [NutritionixModule],
  controllers: [NutritionController],
  providers: [NutritionService, NutritionRepository],
  exports: [NutritionRepository],
})
export class NutritionModule {}
