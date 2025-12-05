import { Injectable, Logger, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { PrismaService } from "../prisma/prisma.service";
import { firstValueFrom } from "rxjs";
import { RabbitMQService } from "../rabbitmq/rabbitmq.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes cache for activities
  private readonly CACHE_KEY_PREFIX = "strava:activities:";

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly redisService: RedisService
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
      // Invalidate cache when new activities are created/updated
      await this.invalidateActivitiesCache();
    }
  }

  async enqueueActivityFetch(activityId: number, correlationId?: string) {
    const job = { activityId, correlationId };
    await this.rabbitMQService.publish("strava-activity-sync", job);
  }

  private async getTokenRecord() {
    return this.prisma.stravaToken.findUnique({
      where: { id: 1 },
    });
  }

  private async ensureValidToken() {
    const tokenRecord = await this.getTokenRecord();

    if (!tokenRecord) {
      throw new NotFoundException("Strava account is not connected");
    }

    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 60;

    if (tokenRecord.expiresAt <= now + bufferSeconds) {
      const refreshed = await this.refreshToken(tokenRecord.refreshToken);
      const updated = await this.upsertStravaToken(refreshed);
      return updated;
    }

    return tokenRecord;
  }

  async fetchRecentActivities(perPage = 20) {
    const limit = Math.min(Math.max(perPage, 1), 50);
    const cacheKey = `${this.CACHE_KEY_PREFIX}${limit}`;

    // Try to get from cache first
    try {
      const cached = await this.redisService.get<any[]>(cacheKey);
      if (cached) {
        this.logger.log(`Returning cached Strava activities (limit: ${limit})`);
        return cached;
      }
    } catch (cacheError) {
      this.logger.warn("Failed to read from cache, proceeding with API call", cacheError);
    }

    let tokenRecord = await this.ensureValidToken();

    try {
      const response = await firstValueFrom(
        this.http.get("https://www.strava.com/api/v3/athlete/activities", {
          params: { per_page: limit },
          headers: {
            Authorization: `Bearer ${tokenRecord.accessToken}`,
          },
        })
      );

      const activities = response.data;

      // Cache the response
      try {
        await this.redisService.set(cacheKey, activities, this.CACHE_TTL_SECONDS);
        this.logger.log(`Cached Strava activities for ${this.CACHE_TTL_SECONDS} seconds`);
      } catch (cacheError) {
        this.logger.warn("Failed to cache activities, but returning data", cacheError);
      }

      return activities;
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401) {
        try {
          const refreshed = await this.refreshToken(tokenRecord.refreshToken);
          tokenRecord = await this.upsertStravaToken(refreshed);

          const retryResponse = await firstValueFrom(
            this.http.get("https://www.strava.com/api/v3/athlete/activities", {
              params: { per_page: limit },
              headers: {
                Authorization: `Bearer ${tokenRecord.accessToken}`,
              },
            })
          );

          const activities = retryResponse.data;

          // Cache the retry response
          try {
            await this.redisService.set(cacheKey, activities, this.CACHE_TTL_SECONDS);
            this.logger.log(`Cached Strava activities after token refresh`);
          } catch (cacheError) {
            this.logger.warn("Failed to cache activities after refresh", cacheError);
          }

          return activities;
        } catch (refreshError) {
          this.logger.error("Failed to refresh Strava token during activities fetch", refreshError);
        }
      }

      this.logger.error("Failed to fetch Strava activities", error);
      throw new InternalServerErrorException("Unable to fetch Strava activities at this time");
    }
  }

  async invalidateActivitiesCache() {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        this.logger.warn("Redis client not available for cache invalidation");
        return;
      }
      const keys = await client.keys(`${this.CACHE_KEY_PREFIX}*`);
      if (keys.length > 0) {
        await client.del(...keys);
        this.logger.log(`Invalidated ${keys.length} activity cache entries`);
      }
    } catch (error) {
      this.logger.warn("Failed to invalidate activities cache", error);
    }
  }
}
