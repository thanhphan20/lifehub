import { Controller, Post, Body } from "@nestjs/common";
import { UnifiedIngestService, UnifiedIngestDto } from "./unified-ingest.service";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("Unified")
@Controller("v1/ingest")
export class UnifiedIngestController {
  constructor(private readonly ingestService: UnifiedIngestService) {}

  @Post("unified")
  @ApiOperation({ summary: "Unified ingestion for both natural language and structured data" })
  @ApiResponse({ status: 202, description: "Ingestion accepted and processing started" })
  async ingest(@Body() dto: UnifiedIngestDto) {
    return this.ingestService.ingest(dto);
  }
}
