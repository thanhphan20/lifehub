import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../prisma/prisma.service";
import {
  createTestApp,
  clearTables,
  resetTestState,
  flushOutbox,
  getPublishedEvents,
} from "../../test/app.bootstrap";

describe("Mood (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    resetTestState();
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "mood_logs" RESTART IDENTITY CASCADE`);
    await clearTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /mood/logs", () => {
    it("creates a mood log, persists it, and records a mood.created outbox event", async () => {
      const res = await request(app.getHttpServer())
        .post("/mood/logs")
        .send({ rating: 7, tags: ["calm", "focused"], notes: "Feeling good" })
        .expect(201);

      expect(res.body.message).toBe("Mood log created successfully");
      expect(res.body.id).toBeDefined();
      // LoggingInterceptor generates a correlationId when no header is sent
      expect(res.body.correlationId).toBeDefined();

      // Persisted
      const persisted = await request(app.getHttpServer()).get(`/mood/logs/${res.body.id}`).expect(200);
      expect(persisted.body.rating).toBe(7);
      expect(persisted.body.tags).toEqual(["calm", "focused"]);
      expect(persisted.body.notes).toBe("Feeling good");

      // Outbox row created
      const outbox = await prisma.outbox.findMany({ where: { eventType: "mood.created" } });
      expect(outbox).toHaveLength(1);
      expect(outbox[0].status).toBe("PENDING");
      expect((outbox[0].payload as any).id).toBe(res.body.id);

      // Draining the outbox publishes the event
      await flushOutbox(app);
      const published = getPublishedEvents().filter((e) => e.topic === "mood.created");
      expect(published).toHaveLength(1);
      expect(published[0].message.id).toBe(res.body.id);
    });

    it("propagates an x-correlation-id header into the response", async () => {
      const res = await request(app.getHttpServer())
        .post("/mood/logs")
        .set("x-correlation-id", "corr-123")
        .send({ rating: 5 })
        .expect(201);

      expect(res.body.correlationId).toBe("corr-123");
    });

    it("rejects a missing rating with 400", async () => {
      await request(app.getHttpServer()).post("/mood/logs").send({}).expect(400);
    });

    it("rejects a rating above the 1-10 range with 400", async () => {
      await request(app.getHttpServer()).post("/mood/logs").send({ rating: 15 }).expect(400);
    });

    it("rejects a non-numeric rating with 400", async () => {
      await request(app.getHttpServer()).post("/mood/logs").send({ rating: "seven" }).expect(400);
    });

    it("rejects unknown properties with 400 (forbidNonWhitelisted)", async () => {
      await request(app.getHttpServer())
        .post("/mood/logs")
        .send({ rating: 6, unexpected: true })
        .expect(400);
    });
  });

  describe("GET /mood/logs", () => {
    it("returns paginated mood logs", async () => {
      await request(app.getHttpServer()).post("/mood/logs").send({ rating: 3 }).expect(201);
      await request(app.getHttpServer()).post("/mood/logs").send({ rating: 8 }).expect(201);

      const res = await request(app.getHttpServer()).get("/mood/logs?page=1&limit=10").expect(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe("GET /mood/logs/:id", () => {
    it("returns 500 when the mood log does not exist (generic error, not NotFound)", async () => {
      await request(app.getHttpServer()).get("/mood/logs/does-not-exist").expect(500);
    });
  });
});
