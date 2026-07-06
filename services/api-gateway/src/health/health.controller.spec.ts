import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should return ok status", () => {
    const req = { headers: {} } as any;
    const result = controller.getHealth(req);

    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
    expect(result.correlationId).toBeNull();
  });

  it("should propagate correlation id from header", () => {
    const req = { headers: { "x-correlation-id": "test-123" } } as any;
    const result = controller.getHealth(req);

    expect(result.correlationId).toBe("test-123");
  });
});
