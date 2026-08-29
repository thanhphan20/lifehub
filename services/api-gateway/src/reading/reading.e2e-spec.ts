import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../prisma/prisma.service";
import { createTestApp, clearTables, resetTestState } from "../../test/app.bootstrap";

describe("Reading (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    resetTestState();
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "reading_sessions" RESTART IDENTITY CASCADE`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "books" RESTART IDENTITY CASCADE`);
    await clearTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /reading/books", () => {
    it("creates a book and persists it", async () => {
      const res = await request(app.getHttpServer())
        .post("/reading/books")
        .send({ title: "The Pragmatic Programmer", author: "Andy Hunt", progress: 25 })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe("The Pragmatic Programmer");
      expect(res.body.status).toBe("READING");
      expect(res.body.progress).toBe(25);

      const persisted = await request(app.getHttpServer()).get(`/reading/books/${res.body.id}`).expect(200);
      expect(persisted.body.title).toBe("The Pragmatic Programmer");
    });

    it("rejects a missing title with 400", async () => {
      await request(app.getHttpServer()).post("/reading/books").send({}).expect(400);
    });

    it("rejects progress outside 0-100 with 400", async () => {
      await request(app.getHttpServer())
        .post("/reading/books")
        .send({ title: "Book", progress: 150 })
        .expect(400);
    });

    it("rejects an invalid status enum with 400", async () => {
      await request(app.getHttpServer())
        .post("/reading/books")
        .send({ title: "Book", status: "DNF" })
        .expect(400);
    });
  });

  describe("PATCH /reading/books/:id/progress", () => {
    it("updates progress and status", async () => {
      const created = await request(app.getHttpServer())
        .post("/reading/books")
        .send({ title: "Clean Code" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/reading/books/${created.body.id}/progress`)
        .send({ progress: 100, status: "COMPLETED" })
        .expect(200);

      expect(res.body.progress).toBe(100);
      expect(res.body.status).toBe("COMPLETED");
      expect(res.body.completedAt).toBeDefined();
    });

    it("returns 404 for a nonexistent book", async () => {
      await request(app.getHttpServer())
        .patch("/reading/books/does-not-exist/progress")
        .send({ progress: 50 })
        .expect(404);
    });

    it("rejects a missing progress with 400", async () => {
      const created = await request(app.getHttpServer())
        .post("/reading/books")
        .send({ title: "Book" })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/reading/books/${created.body.id}/progress`)
        .send({})
        .expect(400);
    });
  });

  describe("PATCH /reading/books/:id/rating", () => {
    it("rates a book", async () => {
      const created = await request(app.getHttpServer())
        .post("/reading/books")
        .send({ title: "Refactoring" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/reading/books/${created.body.id}/rating`)
        .send({ rating: 5 })
        .expect(200);

      expect(res.body.rating).toBe(5);
    });

    it("returns 404 for a nonexistent book", async () => {
      await request(app.getHttpServer())
        .patch("/reading/books/does-not-exist/rating")
        .send({ rating: 4 })
        .expect(404);
    });

    it("rejects a rating outside 1-5 with 400", async () => {
      const created = await request(app.getHttpServer())
        .post("/reading/books")
        .send({ title: "Book" })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/reading/books/${created.body.id}/rating`)
        .send({ rating: 9 })
        .expect(400);
    });
  });

  describe("POST /reading/sessions", () => {
    it("creates a reading session for a book", async () => {
      const created = await request(app.getHttpServer())
        .post("/reading/books")
        .send({ title: "Design Patterns" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post("/reading/sessions")
        .send({ bookId: created.body.id, pages: 20, minutes: 30 })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.bookId).toBe(created.body.id);
      expect(res.body.pages).toBe(20);

      const sessions = await request(app.getHttpServer())
        .get(`/reading/books/${created.body.id}/sessions`)
        .expect(200);
      expect(sessions.body).toHaveLength(1);
    });

    it("returns 404 for a nonexistent book", async () => {
      await request(app.getHttpServer())
        .post("/reading/sessions")
        .send({ bookId: "does-not-exist" })
        .expect(404);
    });

    it("rejects a missing bookId with 400", async () => {
      await request(app.getHttpServer()).post("/reading/sessions").send({}).expect(400);
    });
  });

  describe("GET /reading/books", () => {
    it("filters books by status", async () => {
      await request(app.getHttpServer()).post("/reading/books").send({ title: "A" }).expect(201);
      await request(app.getHttpServer())
        .post("/reading/books")
        .send({ title: "B", status: "WISHLIST" })
        .expect(201);

      const res = await request(app.getHttpServer()).get("/reading/books?status=WISHLIST").expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("B");
    });
  });

  describe("GET /reading/books/:id", () => {
    it("returns 404 for a nonexistent book", async () => {
      await request(app.getHttpServer()).get("/reading/books/does-not-exist").expect(404);
    });
  });
});
