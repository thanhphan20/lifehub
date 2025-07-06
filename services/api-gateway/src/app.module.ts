import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { WorkoutModule } from "./workout/workout.module";
import { KafkaService } from "./kafka/kafka.service";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { LoggingInterceptor } from "./common/logging.interceptor";
import { HealthController } from "./health.controller";

@Module({
  imports: [WorkoutModule],
  controllers: [HealthController],
  providers: [
    KafkaService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
