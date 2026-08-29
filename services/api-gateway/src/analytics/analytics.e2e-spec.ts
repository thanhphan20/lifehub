import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetTestState, fakeRedis } from "../../test/app.bootstrap";

describe("Analytics (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    resetTestState();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /analytics/daily", () => {
    it("returns zeroed defaults when no analytics data exists", async () => {
      const res = await request(app.getHttpServer()).get("/analytics/daily?date=2026-08-29").expect(200);

      expect(res.body.date).toBe("2026-08-29");
      expect(res.body.workouts).toBe(0);
      expect(res.body.mood.average).toBeNull();
      expect(res.body.nutrition.calories).toBe(0);
      expect(res.body.hasSummary).toBe(false);
    });

    it("aggregates seeded Redis analytics data", async () => {
      const base = "analytics:daily:2026-08-29";
      await fakeRedis.set(`${base}:workouts`, 3);
      await fakeRedis.set(`${base}:mood:ratings`, [5, 7]);
      await fakeRedis.set(`${base}:mood:tags`, { calm: 2 });
      await fakeRedis.set(`${base}:nutrition:calories`, 1800);
      await fakeRedis.set(`${base}:nutrition:protein`, 120);
      await fakeRedis.set(`${base}:nutrition:carbs`, 200);
      await fakeRedis.set(`${base}:nutrition:fat`, 60);
      await fakeRedis.set(`${base}:nutrition:count`, 3);
      await fakeRedis.set(`${base}:todos:completed`, 5);
      await fakeRedis.set(`${base}:todos:skipped`, 1);
      await fakeRedis.set(`${base}:summary:exists`, "1");
      await fakeRedis.set(`${base}:reading:minutes`, 45);
      await fakeRedis.set(`${base}:reading:pages`, 30);
      await fakeRedis.set(`${base}:self-tests`, 2);

      const res = await request(app.getHttpServer()).get("/analytics/daily?date=2026-08-29").expect(200);

      expect(res.body.workouts).toBe(3);
      expect(res.body.mood.average).toBe(6);
      expect(res.body.mood.count).toBe(2);
      expect(res.body.mood.tagFrequency).toEqual({ calm: 2 });
      expect(res.body.nutrition.calories).toBe(1800);
      expect(res.body.nutrition.mealCount).toBe(3);
      expect(res.body.todos.completed).toBe(5);
      expect(res.body.todos.skipped).toBe(1);
      expect(res.body.reading.minutes).toBe(45);
      expect(res.body.reading.pages).toBe(30);
      expect(res.body.learning.selfTests).toBe(2);
      expect(res.body.hasSummary).toBe(true);
    });
  });

  describe("GET /analytics/weekly", () => {
    it("returns a weekly summary with totals", async () => {
      const res = await request(app.getHttpServer()).get("/analytics/weekly").expect(200);

      expect(res.body.week).toBeDefined();
      expect(res.body.totals).toBeDefined();
      expect(res.body.daily).toHaveLength(7);
    });
  });

  describe("GET /analytics/correlations", () => {
    it("returns the placeholder correlation structure", async () => {
      const res = await request(app.getHttpServer()).get("/analytics/correlations?period=week").expect(200);

      expect(res.body.period).toBe("week");
      expect(res.body.correlations).toBeDefined();
      expect(res.body.correlations.moodVsProductivity).toBeNull();
    });
  });
});
