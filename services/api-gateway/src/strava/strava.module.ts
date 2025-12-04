import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { StravaService } from "./strava.service";
import { StravaController } from "./strava.controller";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [StravaService],
  controllers: [StravaController],
  exports: [StravaService],
})
export class StravaModule {}
