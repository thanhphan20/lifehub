import { Global, Module } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";
import { RabbitMQPublisher } from "./rabbitmq.publisher";

@Global()
@Module({
  providers: [RabbitMQService, RabbitMQPublisher],
  exports: [RabbitMQService, RabbitMQPublisher],
})
export class RabbitMQModule {}
