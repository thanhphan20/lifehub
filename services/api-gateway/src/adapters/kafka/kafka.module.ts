import { Module, Global } from "@nestjs/common";
import { KafkaService } from "./kafka.service";
import { KafkaPublisher } from "./kafka.publisher";

@Global()
@Module({
  providers: [KafkaService, KafkaPublisher],
  exports: [KafkaService, KafkaPublisher],
})
export class KafkaModule {}



