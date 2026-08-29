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

describe("DailyController (e2e)", () => {
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

  it("POST /daily/todos creates a todo", async () => {
    const created = await request(app.getHttpServer())
      .post("/daily/todos")
      .send({ text: "Write 500 words" })
      .expect(201);

    expect(created.body.todo.text).toBe("Write 500 words");
    expect(created.body.todo.status).toBe("pending");
    const todoId = created.body.todo.id;

    const getRes = await request(app.getHttpServer()).get("/daily").expect(200);
    const todos = getRes.body.todos;
    expect(todos.some((t: any) => t.id === todoId)).toBe(true);
  });

  it("PATCH /daily/todos/status updates a todo and the change persists", async () => {
    const created = await request(app.getHttpServer())
      .post("/daily/todos")
      .send({ text: "Write 500 words" })
      .expect(201);
    const todoId = created.body.todo.id;

    const patched = await request(app.getHttpServer())
      .patch("/daily/todos/status")
      .send({ todoId, status: "done" })
      .expect(200);

    expect(patched.body.status).toBe("done");

    const getRes = await request(app.getHttpServer()).get("/daily").expect(200);
    const todos = getRes.body.todos as any[];
    const todo = todos.find((t) => t.id === todoId);
    expect(todo.status).toBe("done");
  });

  it("POST /daily/summary saves the summary", async () => {
    const res = await request(app.getHttpServer())
      .post("/daily/summary")
      .send({ summary: "Shipped mood logging" })
      .expect(201);

    expect(res.body.summary).toBe("Shipped mood logging");

    const getRes = await request(app.getHttpServer()).get("/daily").expect(200);
    expect(getRes.body.summary).toBe("Shipped mood logging");
  });

  it("POST /daily/log persists the log and emits v1.daily.raw.ingest via outbox", async () => {
    const res = await request(app.getHttpServer())
      .post("/daily/log")
      .send({ text: "Ran 5k and did deep work" })
      .expect(201);

    expect(res.body.log.text).toBe("Ran 5k and did deep work");

    const outbox = await prisma.outbox.findFirst({ where: { eventType: "v1.daily.raw.ingest" } });
    expect(outbox).not.toBeNull();

    await flushOutbox(app);
    expect(getPublishedEvents().some((e) => e.topic === "v1.daily.raw.ingest")).toBe(true);

    const getRes = await request(app.getHttpServer()).get("/daily").expect(200);
    const logs = getRes.body.logs as any[];
    expect(logs.some((l: any) => l.text === "Ran 5k and did deep work")).toBe(true);
  });

  it("POST /daily/todos rejects missing text with 400", async () => {
    await request(app.getHttpServer()).post("/daily/todos").send({}).expect(400);
  });

  it("POST /daily/log rejects missing text with 400", async () => {
    await request(app.getHttpServer()).post("/daily/log").send({}).expect(400);
  });

  it("PATCH /daily/todos/status rejects an invalid status with 400", async () => {
    await request(app.getHttpServer())
      .patch("/daily/todos/status")
      .send({ todoId: "00000000-0000-0000-0000-000000000000", status: "maybe" })
      .expect(400);
  });
});