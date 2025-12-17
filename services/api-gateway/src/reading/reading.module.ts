import { Module } from "@nestjs/common";
import { ReadingController } from "./reading.controller";
import { ReadingService } from "./reading.service";
import { ReadingRepository, ReadingSessionRepository } from "./reading.repository";

@Module({
  controllers: [ReadingController],
  providers: [ReadingService, ReadingRepository, ReadingSessionRepository],
})
export class ReadingModule {}
