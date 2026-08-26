import { Module } from "@nestjs/common";
import { InboxService } from "./inbox.service";
import { InboxRepository } from "./inbox.repository";

@Module({
  providers: [InboxService, InboxRepository],
  exports: [InboxService],
})
export class InboxModule {}
