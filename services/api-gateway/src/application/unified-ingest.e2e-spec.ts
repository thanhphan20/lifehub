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

describe("Unified Ingest (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    resetTestState();
    await clearTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /v1/ingest/unified", () => {
    it("ingests structured nutrition, persists a meal, and emits v1.nutrition.enriched.logged", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/ingest/unified")
        .send({
          structured: [
            {
              type: "nutrition",
              data: {
                description: "Post-workout Shake",
                date: "2026-08-29T00:00:00.000Z",
                calories: 350,
                protein: 40,
                carbs: 20,
                fat: 5,
              },
            },
          ],
        })
        .expect(201);

      expect(res.body.correlationId).toBeDefined();
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].type).toBe("nutrition-structured");
      expect(res.body.results[0].id).toBeDefined();

      // Persisted meal
      const meal = await prisma.mealLog.findUnique({ where: { id: res.body.results[0].id } });
      expect(meal).not.toBeNull();
      expect(meal!.description).toBe("Post-workout Shake");
      expect(meal!.calories).toBe(350);

      // Outbox event
      const outbox = await prisma.outbox.findMany({ where: { eventType: "v1.nutrition.enriched.logged" } });
      expect(outbox).toHaveLength(1);
      expect((outbox[0].payload as any).correlationId).toBe(res.body.correlationId);

      await flushOutbox(app);
      const published = getPublishedEvents().filter((e) => e.topic === "v1.nutrition.enriched.logged");
      expect(published).toHaveLength(1);
    });

    it("ingests structured workout, persists a workout, and emits v1.workout.enriched.logged", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/ingest/unified")
        .send({
          structured: [
            { type: "workout", data: { type: "bench_press", sets: 3, reps: 10, weight: 100 } },
          ],
        })
        .expect(201);

      expect(res.body.results[0].type).toBe("workout-structured");
      expect(res.body.results[0].id).toBeDefined();

      const workout = await prisma.workoutLog.findUnique({ where: { id: res.body.results[0].id } });
      expect(workout).not.toBeNull();
      expect(workout!.type).toBe("bench_press");

      const outbox = await prisma.outbox.findMany({ where: { eventType: "v1.workout.enriched.logged" } });
      expect(outbox).toHaveLength(1);

      await flushOutbox(app);
      const published = getPublishedEvents().filter((e) => e.topic === "v1.workout.enriched.logged");
      expect(published).toHaveLength(1);
    });

    it("ingests multiple structured items in a single request", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/ingest/unified")
        .send({
          structured: [
            { type: "nutrition", data: { description: "Lunch", date: "2026-08-29T00:00:00.000Z", calories: 500, protein: 30, carbs: 60, fat: 10 } },
            { type: "workout", data: { type: "squat", sets: 5, reps: 5, weight: 120 } },
          ],
        })
        .expect(201);

      expect(res.body.results).toHaveLength(2);
      expect(res.body.results.map((r: any) => r.type)).toEqual(["nutrition-structured", "workout-structured"]);
    });

    it("returns 500 for NLP text (app-code limitation: NLP path omits required meal macros)", async () => {
      // ponytail: unified-ingest.service.ts creates a MealLog with only description/date/rawText,
      // but MealLog requires calories/protein/carbs/fat. The NLP path is broken in app code;
      // this characterization test locks in the current behavior until the service is fixed.
      const res = await request(app.getHttpServer())
        .post("/v1/ingest/unified")
        .send({ text: "Ate 2 large scrambled eggs and 1 slice of whole wheat toast" })
        .expect(500);

      expect(res.body.statusCode).toBe(500);
    });

    it("returns an empty result set when no text or structured data is provided", async () => {
      const res = await request(app.getHttpServer()).post("/v1/ingest/unified").send({}).expect(201);

      expect(res.body.correlationId).toBeDefined();
      expect(res.body.results).toEqual([]);
    });
  });
});
