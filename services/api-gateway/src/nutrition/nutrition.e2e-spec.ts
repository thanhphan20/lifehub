import { INestApplication } from "@nestjs/common";
import request from "supertest";
import {
  createTestApp,
  clearTables,
  resetTestState,
  getPublishedEvents,
  flushOutbox,
} from "../../test/app.bootstrap";
import { PrismaService } from "../prisma/prisma.service";

describe("NutritionController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await clearTables(prisma);
    resetTestState();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /nutrition/meals creates a meal and a v1.nutrition.raw.ingest outbox row", async () => {
    const res = await request(app.getHttpServer())
      .post("/nutrition/meals")
      .send({ description: "2 eggs and whole wheat toast" })
      .expect(201);

    expect(res.body.message).toBe("Meal logged successfully");
    expect(res.body.meal.id).toBeDefined();
    expect(res.body.meal.description).toBe("2 eggs and whole wheat toast");

    const outbox = await prisma.outbox.findFirst({ where: { eventType: "v1.nutrition.raw.ingest" } });
    expect(outbox).not.toBeNull();

    await flushOutbox(app);
    expect(getPublishedEvents().some((e) => e.topic === "v1.nutrition.raw.ingest")).toBe(true);
  });

  it("POST /nutrition/meals with structured macros emits v1.nutrition.enriched.logged", async () => {
    const res = await request(app.getHttpServer())
      .post("/nutrition/meals")
      .send({ description: "Protein shake", calories: 350, protein: 40, carbs: 20, fat: 5 })
      .expect(201);

    expect(res.body.meal.calories).toBe(350);
    expect(res.body.meal.protein).toBe(40);

    const outbox = await prisma.outbox.findFirst({ where: { eventType: "v1.nutrition.enriched.logged" } });
    expect(outbox).not.toBeNull();
  });

  it("GET /nutrition/meals?date= returns meals for that date", async () => {
    await request(app.getHttpServer())
      .post("/nutrition/meals")
      .send({ description: "Chicken salad" })
      .expect(201);

    const meal = await prisma.mealLog.findFirst({ orderBy: { createdAt: "desc" } });
    const d = new Date(meal!.date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

    const res = await request(app.getHttpServer()).get(`/nutrition/meals?date=${dateStr}`).expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].description).toBe("Chicken salad");
  });

  it("GET /nutrition/stats?period=week returns stats", async () => {
    await request(app.getHttpServer())
      .post("/nutrition/meals")
      .send({ description: "Oatmeal", calories: 300, protein: 10, carbs: 50, fat: 5 })
      .expect(201);

    const res = await request(app.getHttpServer()).get("/nutrition/stats?period=week").expect(200);

    expect(res.body).toBeDefined();
  });

  it("POST /nutrition/meals rejects a payload missing description with 400", async () => {
    await request(app.getHttpServer()).post("/nutrition/meals").send({}).expect(400);
  });
});