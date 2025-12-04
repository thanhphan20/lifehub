import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { PrismaService } from "../prisma/prisma.service";
import { firstValueFrom } from "rxjs";
import { RabbitMQService } from "../rabbitmq/rabbitmq.service";

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly rabbitMQService: RabbitMQService
  ) {
    this.clientId = this.configService.get<string>("STRAVA_CLIENT_ID") || "";
    this.clientSecret = this.configService.get<string>("STRAVA_CLIENT_SECRET") || "";
    this.redirectUri = this.configService.get<string>("STRAVA_REDIRECT_URI") || "";
  }

  getAuthorizeUrl(state = "sync") {
    const url = new URL("https://www.strava.com/oauth/authorize");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "activity:read_all,activity:write");
    url.searchParams.set("state", state);
    url.searchParams.set("approval_prompt", "auto");
    return url.toString();
  }

  // Exchange code for tokens
  async exchangeCode(code: string) {
    const payload = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: "authorization_code",
    });

    const response = await firstValueFrom(
      this.http.post("https://www.strava.com/oauth/token", payload.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );

    this.logger.log("Successfully exchanged Strava OAuth code.");

    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const payload = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await firstValueFrom(
      this.http.post("https://www.strava.com/api/v3/oauth/token", payload.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );

    this.logger.log("Refreshed Strava access token.");

    return response.data;
  }

  async upsertStravaToken(payload: any) {
    return await this.prisma.stravaToken.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt: payload.expires_at,
      },
      update: {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt: payload.expires_at,
      },
    });
  }

  async handleWebhook(event: any) {
    if (event.object_type === "activity") {
      await this.enqueueActivityFetch(event.object_id);
    }
  }

  async enqueueActivityFetch(activityId: number, correlationId?: string) {
    const job = { activityId, correlationId };
    await this.rabbitMQService.publish("strava-activity-sync", job);
  }
}
