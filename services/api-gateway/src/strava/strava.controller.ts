import { Controller, Get, Query, Req, Post, Body, Headers, Logger, Res } from "@nestjs/common";
import { StravaService } from "./strava.service";

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
  async callback(@Query("code") code: string, @Query("state") state: string) {
    if (!code) return { ok: false, error: "Missing OAuth code" };

    const tokens = await this.strava.exchangeCode(code);

    await this.strava.upsertStravaToken(tokens);

    return { ok: true, message: "Strava connected successfully" };
  }

  @Get("webhook")
  verifySubscription(@Query("hub.challenge") challenge: string, @Res() res: Response) {
    if (!challenge) return { error: "Missing challenge" };

    return {
      challenge: challenge,
    };
  }

  // Webhook verification and events
  @Post("webhook")
  async webhook(@Body() body: any, @Headers("x-strava-signature") signature: string) {
    this.logger.log("Webhook event received", body);

    const { object_type, object_id, aspect_type } = body;

    if (object_type === "activity") {
      // Only sync new or updated workouts
      if (["create", "update"].includes(aspect_type)) {
        await this.strava.enqueueActivityFetch(object_id);
      }
    }

    return { received: true };
  }
}
