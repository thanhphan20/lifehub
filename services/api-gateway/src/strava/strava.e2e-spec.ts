import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../prisma/prisma.service";
import { StravaService } from "./strava.service";
import { createTestApp, clearTables, resetTestState } from "../../test/app.bootstrap";

describe("Strava (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let strava: StravaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    strava = app.get(StravaService);
  });

  beforeEach(async () => {
    resetTestState();
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "strava_tokens" RESTART IDENTITY CASCADE`);
    await clearTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /strava/authorize", () => {
    it("returns a Strava OAuth authorize URL carrying the state", async () => {
      const res = await request(app.getHttpServer()).get("/strava/authorize?state=my-state").expect(200);

      expect(res.body.url).toContain("https://www.strava.com/oauth/authorize");
      expect(res.body.url).toContain("state=my-state");
    });
  });

  describe("GET /strava/callback", () => {
    it("returns ok:false when the OAuth code is missing (no external call)", async () => {
      const res = await request(app.getHttpServer()).get("/strava/callback").expect(200);

      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe("Missing OAuth code");
    });
  });

  describe("GET /strava/activities", () => {
    it("returns 404 when no Strava account is connected (no external call)", async () => {
      await request(app.getHttpServer()).get("/strava/activities").expect(404);
    });
  });

  describe("GET /strava/webhook", () => {
    it("echoes the hub.challenge on a valid verification request", async () => {
      const res = await request(app.getHttpServer())
        .get("/strava/webhook")
        .query({ "hub.mode": "subscribe", "hub.verify_token": strava.getWebhookVerifyToken(), "hub.challenge": "abc123" })
        .expect(200);

      expect(res.body["hub.challenge"]).toBe("abc123");
    });

    it("returns 400 when required parameters are missing", async () => {
      const res = await request(app.getHttpServer()).get("/strava/webhook").expect(200);

      expect(res.body.status).toBe(400);
    });

    it("returns 403 when the verify token is invalid", async () => {
      const res = await request(app.getHttpServer())
        .get("/strava/webhook")
        .query({ "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "abc123" })
        .expect(200);

      expect(res.body.status).toBe(403);
    });
  });

  describe("POST /strava/webhook", () => {
    it("acknowledges a webhook event", async () => {
      const res = await request(app.getHttpServer())
        .post("/strava/webhook")
        .send({ object_type: "activity", object_id: 123, aspect_type: "create", owner_id: 1 })
        .expect(201);

      expect(res.body.received).toBe(true);
    });
  });
});
