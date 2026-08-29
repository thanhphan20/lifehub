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

describe("WorkoutController (e2e)", () => {
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

  it("POST /workouts creates a workout log and a workout.created outbox row", async () => {
    const res = await request(app.getHttpServer())
      .post("/workouts")
      .send({ type: "bench_press", sets: 3, reps: 10, weight: 100, rawText: "3 sets of bench press" })
      .expect(201);

    expect(res.body.message).toBe("Workout log created successfully");
    expect(res.body.id).toBeDefined();
    // LoggingInterceptor generates a UUID correlation id when none is supplied.
    expect(typeof res.body.correlationId).toBe("string");

    const outbox = await prisma.outbox.findFirst({ where: { eventType: "workout.created" } });
    expect(outbox).not.toBeNull();
    expect((outbox!.payload as any).id).toBe(res.body.id);

    await flushOutbox(app);
    expect(getPublishedEvents().some((e) => e.topic === "workout.created")).toBe(true);
  });

  it("POST /workouts echoes the x-correlation-id header", async () => {
    const res = await request(app.getHttpServer())
      .post("/workouts")
      .set("x-correlation-id", "corr-workout-1")
      .send({ type: "squat", sets: 5, reps: 5, weight: 140, rawText: "5 sets of squat" })
      .expect(201);

    expect(res.body.correlationId).toBe("corr-workout-1");
  });

  it("GET /workouts lists created workouts", async () => {
    await request(app.getHttpServer())
      .post("/workouts")
      .send({ type: "deadlift", sets: 3, reps: 5, weight: 180, rawText: "3 sets of deadlift" })
      .expect(201);

    const res = await request(app.getHttpServer()).get("/workouts").expect(200);

    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);

    const count = await prisma.workoutLog.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("GET /workouts/:id returns the workout log", async () => {
    const created = await request(app.getHttpServer())
      .post("/workouts")
      .send({ type: "overhead_press", sets: 4, reps: 8, weight: 60, rawText: "4 sets of overhead press" })
      .expect(201);

    const res = await request(app.getHttpServer()).get(`/workouts/${created.body.id}`).expect(200);

    expect(res.body.id).toBe(created.body.id);
    expect(res.body.type).toBe("overhead_press");
  });

  it("POST /workouts rejects a payload missing required fields with 400", async () => {
    await request(app.getHttpServer())
      .post("/workouts")
      .send({ type: "bench_press" })
      .expect(400);
  });

  it("POST /workouts rejects non-whitelisted properties with 400", async () => {
    await request(app.getHttpServer())
      .post("/workouts")
      .send({ type: "bench_press", sets: 3, reps: 10, weight: 100, rawText: "x", evil: true })
      .expect(400);
  });
});