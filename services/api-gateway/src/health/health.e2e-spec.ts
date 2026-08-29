import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "../../test/app.bootstrap";

describe("HealthController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns 200 with expected shape", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);

    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
    expect(res.body).toHaveProperty("correlationId");
  });

  it("GET /health echoes the x-correlation-id header", async () => {
    const res = await request(app.getHttpServer())
      .get("/health")
      .set("x-correlation-id", "corr-e2e-123")
      .expect(200);

    expect(res.body.correlationId).toBe("corr-e2e-123");
  });
});