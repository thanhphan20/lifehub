import { Controller, Get, Req } from "@nestjs/common";
import { Request } from "express";

/**
 * Controller for health check endpoint.
 * Provides a simple API health status and propagates correlation ID for tracing.
 */
@Controller("health")
export class HealthController {
  /**
   * GET /health
   * Returns API health status, timestamp, and correlation ID if present.
   */
  @Get()
  getHealth(@Req() req: Request) {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      correlationId: req.headers["x-correlation-id"] || null,
    };
  }
}
