import { Test, TestingModule } from "@nestjs/testing";
import { WorkoutController } from "./workout.controller";
import { WorkoutService } from "./workout.service";

describe("WorkoutController", () => {
  let controller: WorkoutController;
  let mockWorkoutService: any;

  beforeEach(async () => {
    mockWorkoutService = {
      logWorkout: jest.fn(),
      getWorkoutLogs: jest.fn(),
      getWorkoutLogById: jest.fn(),
      getWorkoutStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkoutController],
      providers: [{ provide: WorkoutService, useValue: mockWorkoutService }],
    }).compile();

    controller = module.get<WorkoutController>(WorkoutController);
  });

  describe("logWorkout", () => {
    it("should log a workout with correlation id", async () => {
      const dto = { type: "bench_press", sets: 3, reps: 10, weight: 100 };
      const req = { headers: { "x-correlation-id": "corr-123" } } as any;

      mockWorkoutService.logWorkout.mockResolvedValue({ id: "log-123" });

      const result = await controller.logWorkout(dto, req);

      expect(result.message).toBe("Workout log created successfully");
      expect(result.id).toBe("log-123");
      expect(result.correlationId).toBe("corr-123");
    });

    it("should log a workout without correlation id", async () => {
      const dto = { type: "bench_press", sets: 3, reps: 10, weight: 100 };
      const req = { headers: {} } as any;

      mockWorkoutService.logWorkout.mockResolvedValue({ id: "log-123" });

      const result = await controller.logWorkout(dto, req);

      expect(result.correlationId).toBeNull();
    });
  });

  describe("getWorkoutLogs", () => {
    it("should return workout logs with default pagination", async () => {
      const logs = { data: [], meta: { total: 0 } };
      mockWorkoutService.getWorkoutLogs.mockResolvedValue(logs);

      const result = await controller.getWorkoutLogs(undefined, undefined);

      expect(result).toBeDefined();
      expect(mockWorkoutService.getWorkoutLogs).toHaveBeenCalledWith(10, 0);
    });

    it("should return workout logs with custom pagination", async () => {
      const logs = { data: [], meta: { total: 0 } };
      mockWorkoutService.getWorkoutLogs.mockResolvedValue(logs);

      const result = await controller.getWorkoutLogs(20, 40);

      expect(result).toBeDefined();
      expect(mockWorkoutService.getWorkoutLogs).toHaveBeenCalledWith(20, 40);
    });
  });

  describe("getWorkoutLogById", () => {
    it("should return a workout log", async () => {
      const log = { id: "log-123", type: "bench_press", sets: 3, reps: 10, weight: 100 };
      mockWorkoutService.getWorkoutLogById.mockResolvedValue(log);

      const result = await controller.getWorkoutLogById("log-123");

      expect(result).toBeDefined();
    });

    it("should throw error if workout log not found", async () => {
      mockWorkoutService.getWorkoutLogById.mockResolvedValue(null);

      await expect(controller.getWorkoutLogById("nonexistent")).rejects.toThrow(
        "Workout log not found",
      );
    });
  });

  describe("getWorkoutStats", () => {
    it("should return stats for specified period", async () => {
      const stats = { count: 5, totalSets: 15 };
      mockWorkoutService.getWorkoutStats.mockResolvedValue(stats);

      const result = await controller.getWorkoutStats("week");

      expect(result).toBeDefined();
      expect(mockWorkoutService.getWorkoutStats).toHaveBeenCalledWith("week");
    });

    it("should return stats for default period if not specified", async () => {
      const stats = { count: 5, totalSets: 15 };
      mockWorkoutService.getWorkoutStats.mockResolvedValue(stats);

      await controller.getWorkoutStats(undefined);

      expect(mockWorkoutService.getWorkoutStats).toHaveBeenCalledWith(undefined);
    });
  });
});
