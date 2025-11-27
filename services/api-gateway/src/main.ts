import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  // Create hybrid application (HTTP + Microservices)
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Connect RabbitMQ microservice
  const rabbitmqUrl = (configService.get<string>("RABBITMQ_URL") ||
    "amqp://lifehub:lifehub_password@localhost:5672") as string;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: "workout_queue",
      queueOptions: {
        durable: true,
      },
    },
  });

  // HTTP API configuration
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const config = new DocumentBuilder()
    .setTitle("Workout API Gateway")
    .setDescription("API for logging workouts with Kafka and RabbitMQ integration")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/api", app, document);

  // Start all microservices
  await app.startAllMicroservices();
  console.log("✅ Microservices (RabbitMQ) connected");

  // Start HTTP server
  const port = configService.get<number>("PORT") || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`🐰 RabbitMQ Management: http://localhost:15672`);
}
bootstrap();
