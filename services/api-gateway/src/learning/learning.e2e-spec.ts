import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../prisma/prisma.service";
import { createTestApp, clearTables, resetTestState } from "../../test/app.bootstrap";

describe("Learning (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    resetTestState();
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "self_tests" RESTART IDENTITY CASCADE`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "skills" RESTART IDENTITY CASCADE`);
    await clearTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /learning/skills", () => {
    it("creates a skill and persists it", async () => {
      const res = await request(app.getHttpServer())
        .post("/learning/skills")
        .send({ name: "TypeScript", proficiency: 60, notes: "Advanced types" })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe("TypeScript");
      expect(res.body.proficiency).toBe(60);

      const persisted = await request(app.getHttpServer()).get(`/learning/skills/${res.body.id}`).expect(200);
      expect(persisted.body.name).toBe("TypeScript");
    });

    it("rejects a missing name with 400", async () => {
      await request(app.getHttpServer()).post("/learning/skills").send({}).expect(400);
    });

    it("rejects proficiency outside 0-100 with 400", async () => {
      await request(app.getHttpServer())
        .post("/learning/skills")
        .send({ name: "Skill", proficiency: 150 })
        .expect(400);
    });
  });

  describe("PATCH /learning/skills/:id/progress", () => {
    it("updates proficiency", async () => {
      const created = await request(app.getHttpServer())
        .post("/learning/skills")
        .send({ name: "Go" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/learning/skills/${created.body.id}/progress`)
        .send({ proficiency: 75, notes: "Completed course" })
        .expect(200);

      expect(res.body.proficiency).toBe(75);
      expect(res.body.notes).toBe("Completed course");
    });

    it("returns 404 for a nonexistent skill", async () => {
      await request(app.getHttpServer())
        .patch("/learning/skills/does-not-exist/progress")
        .send({ proficiency: 50 })
        .expect(404);
    });

    it("rejects a missing proficiency with 400", async () => {
      const created = await request(app.getHttpServer())
        .post("/learning/skills")
        .send({ name: "Skill" })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/learning/skills/${created.body.id}/progress`)
        .send({})
        .expect(400);
    });
  });

  describe("POST /learning/self-tests", () => {
    it("creates a self-test for a skill", async () => {
      const created = await request(app.getHttpServer())
        .post("/learning/skills")
        .send({ name: "Rust" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post("/learning/self-tests")
        .send({ skillId: created.body.id, score: 85 })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.skillId).toBe(created.body.id);
      expect(res.body.score).toBe(85);

      const tests = await request(app.getHttpServer())
        .get(`/learning/skills/${created.body.id}/self-tests`)
        .expect(200);
      expect(tests.body).toHaveLength(1);
    });

    it("returns 404 for a nonexistent skill", async () => {
      await request(app.getHttpServer())
        .post("/learning/self-tests")
        .send({ skillId: "does-not-exist" })
        .expect(404);
    });

    it("rejects a missing skillId with 400", async () => {
      await request(app.getHttpServer()).post("/learning/self-tests").send({}).expect(400);
    });
  });

  describe("GET /learning/skills", () => {
    it("returns all skills", async () => {
      await request(app.getHttpServer()).post("/learning/skills").send({ name: "A" }).expect(201);
      await request(app.getHttpServer()).post("/learning/skills").send({ name: "B" }).expect(201);

      const res = await request(app.getHttpServer()).get("/learning/skills").expect(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("GET /learning/skills/:id", () => {
    it("returns 404 for a nonexistent skill", async () => {
      await request(app.getHttpServer()).get("/learning/skills/does-not-exist").expect(404);
    });
  });
});
