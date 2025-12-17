import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { NutritionixService } from "./nutritionix.service";

@Module({
  imports: [
    HttpModule.register({
      baseURL: "https://trackapi.nutritionix.com/v2",
      timeout: 5000,
    }),
  ],
  providers: [NutritionixService],
  exports: [NutritionixService],
})
export class NutritionixModule {}
