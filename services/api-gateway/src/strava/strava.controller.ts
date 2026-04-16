import { Controller, Get, Query, Post, Body, Headers, Logger, Res, ParseIntPipe, HttpStatus } from "@nestjs/common";
import { StravaService } from "./strava.service";
// import { ApiResponse, ApiQuery, ApiTags } from "@nestjs/swagger";

@Controller("strava")
export class StravaController {
  private readonly logger = new Logger(StravaController.name);

  constructor(private readonly strava: StravaService) {}

  @Get("authorize")
  redirectToStrava(@Query("state") state: string) {
    const url = this.strava.getAuthorizeUrl(state || "default");
    return { url }; // frontend can redirect user to this url
  }

  @Get("callback")
  async callback(@Query("code") code: string, @Query("scope") scope: string, @Query("state") state: string) {
    if (!code) return { ok: false, error: "Missing OAuth code" };

    const tokens = await this.strava.exchangeCode(code);

    await this.strava.upsertStravaToken(tokens);

    return { ok: true, message: "Strava connected successfully", received: { state, code, scope } };
  }

  @Get("activities")
  async getRecentActivities(@Query("perPage", new ParseIntPipe({ optional: true })) perPage?: number) {
    return this.strava.fetchRecentActivities(perPage ?? 20);
  }

  /**
   * Webhook subscription verification endpoint
   * Strava sends a GET request with hub.challenge, hub.mode, and hub.verify_token
   * Must respond with 200 and echo the challenge within 2 seconds
   */
  @Get("webhook")
  verifySubscription(
    @Query("hub.challenge") challenge: string,
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") verifyToken: string,
    @Res({ passthrough: true }) _res: any,
  ) {
    this.logger.log("Webhook verification request received", { mode, verifyToken });

    // Validate that all required parameters are present
    if (!challenge || !mode || !verifyToken) {
      this.logger.error("Missing required webhook verification parameters");
      return { status: HttpStatus.BAD_REQUEST, error: "Missing required parameters" };
    }

    // Validate the verify token matches what you expect
    // This should match the verify_token you used when creating the subscription
    const expectedVerifyToken = this.strava.getWebhookVerifyToken();
    if (verifyToken !== expectedVerifyToken) {
      this.logger.error("Invalid verify token received", {
        received: verifyToken,
        expected: expectedVerifyToken,
      });
      return { status: HttpStatus.FORBIDDEN, error: "Invalid verify token" };
    }

    // Validate mode is "subscribe"
    if (mode !== "subscribe") {
      this.logger.error("Invalid mode received", { mode });
      return { status: HttpStatus.BAD_REQUEST, error: "Invalid mode" };
    }

    // Echo back the challenge as required by Strava
    this.logger.log("Webhook verification successful, echoing challenge");
    return { "hub.challenge": challenge };
  }

  // Webhook verification and events
  @Post("webhook")
  async webhook(@Body() body: any, @Headers("x-strava-signature") _signature: string) {
    const response = { received: true };

    setImmediate(async () => {
      try {
        this.logger.log("Webhook event received", body);

        const { object_type, object_id, aspect_type, updates, owner_id } = body;

        // Handle activity events
        if (object_type === "activity") {
          // Only sync new or updated activities
          if (aspect_type === "create" || aspect_type === "update") {
            await this.strava.enqueueActivityFetch(object_id);
            this.logger.log(`Enqueued activity ${object_id} for sync (${aspect_type})`);
          } else if (aspect_type === "delete") {
            this.logger.log(`Activity ${object_id} was deleted`);
          }
        }

        // Handle athlete events (e.g., app deauthorization)
        else if (object_type === "athlete") {
          if (updates?.authorized === "false") {
            this.logger.warn(`Athlete ${owner_id} deauthorized the app`);
          }
        }
      } catch (error) {
        this.logger.error("Error processing webhook event", error);
      }
    });

    return response;
  }
}
