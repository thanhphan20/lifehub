import { Module } from "@nestjs/common";
import { DailyController } from "./daily.controller";
import { DailyService } from "./daily.service";
import { DailyRepository } from "./daily.repository";

@Module({
  controllers: [DailyController],
  providers: [DailyService, DailyRepository],
})
export class DailyModule {}
