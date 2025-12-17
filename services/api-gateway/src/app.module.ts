import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { WorkoutModule } from "./workout/workout.module";
import { KafkaModule } from "./adapters/kafka/kafka.module";
import { RabbitMQModule } from "./adapters/rabbitmq/rabbitmq.module";
import { MessagingModule } from "./application/messaging/message.module";
import { RedisModule } from "./adapters/redis/redis.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { LoggingInterceptor } from "./common/logging.interceptor";
import { HealthController } from "./health/health.controller";
import { StravaModule } from "./strava/strava.module";
import { MoodModule } from "./mood/mood.module";
import { NutritionModule } from "./nutrition/nutrition.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    KafkaModule,
    RabbitMQModule,
    RedisModule,
    WorkoutModule,
    StravaModule,
    MoodModule,
    NutritionModule,
    MessagingModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
