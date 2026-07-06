import { Test, TestingModule } from "@nestjs/testing";
import { WorkoutService } from "./workout.service";
import { WorkoutRepository } from "./workout.repository";
import { RedisService } from "../adapters/redis/redis.service";

describe("WorkoutService", () => {
  let service: WorkoutService;
  let mockWorkoutRepo: any;
  let mockRedisService: any;

  beforeEach(async () => {
    mockWorkoutRepo = {
      createWithOutbox: jest.fn(),
      findAllWithPagination: jest.fn(),
      findById: jest.fn(),
      getStatsByPeriod: jest.fn(),
    };

    mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutService,
        { provide: WorkoutRepository, useValue: mockWorkoutRepo },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<WorkoutService>(WorkoutService);
  });

  describe("logWorkout", () => {
    it("should create a workout log with outbox", async () => {
      const dto = { type: "bench_press", sets: 3, reps: 10, weight: 100 };
      const createdLog = { id: "log-123", ...dto };

      mockWorkoutRepo.createWithOutbox.mockResolvedValue(createdLog);

      const result = await service.logWorkout(dto, "corr-123");

      expect(result).toEqual({ id: "log-123" });
      expect(mockWorkoutRepo.createWithOutbox).toHaveBeenCalled();
    });
  });

  describe("getWorkoutLogs", () => {
    it("should return cached logs if available", async () => {
      const cachedData = { logs: [], total: 0 };
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getWorkoutLogs(1, 20);

      expect(result).toBeDefined();
      expect(mockWorkoutRepo.findAllWithPagination).not.toHaveBeenCalled();
    });

    it("should fetch from repo and cache if not cached", async () => {
      const logsData = { data: [], meta: { total: 0, page: 1, perPage: 20, totalPages: 0 } };
      mockRedisService.get.mockResolvedValue(null);
      mockWorkoutRepo.findAllWithPagination.mockResolvedValue(logsData);

      const result = await service.getWorkoutLogs(1, 20);

      expect(result).toBeDefined();
      expect(mockWorkoutRepo.findAllWithPagination).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe("getWorkoutLogById", () => {
    it("should return cached log if available", async () => {
      const log = { id: "log-123", type: "bench_press", sets: 3, reps: 10, weight: 100 };
      mockRedisService.get.mockResolvedValue(JSON.stringify(log));

      const result = await service.getWorkoutLogById("log-123");

      expect(result).toBeDefined();
      expect(mockWorkoutRepo.findById).not.toHaveBeenCalled();
    });

    it("should fetch from repo and cache if not cached", async () => {
      const log = { id: "log-123", type: "bench_press", sets: 3, reps: 10, weight: 100 };
      mockRedisService.get.mockResolvedValue(null);
      mockWorkoutRepo.findById.mockResolvedValue(log);

      const result = await service.getWorkoutLogById("log-123");

      expect(result).toBeDefined();
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it("should not cache if log not found", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockWorkoutRepo.findById.mockResolvedValue(null);

      const result = await service.getWorkoutLogById("nonexistent");

      expect(result).toBeNull();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });

  describe("getWorkoutStats", () => {
    it("should return cached stats if available", async () => {
      const stats = { count: 5, totalSets: 15, totalReps: 150, totalVolume: 1500 };
      mockRedisService.get.mockResolvedValue(JSON.stringify(stats));

      const result = await service.getWorkoutStats("week");

      expect(result).toBeDefined();
      expect(mockWorkoutRepo.getStatsByPeriod).not.toHaveBeenCalled();
    });

    it("should calculate stats for week period", async () => {
      const stats = { count: 5, totalSets: 15, totalReps: 150, totalVolume: 1500 };
      mockRedisService.get.mockResolvedValue(null);
      mockWorkoutRepo.getStatsByPeriod.mockResolvedValue(stats);

      const result = await service.getWorkoutStats("week");

      expect(result).toBeDefined();
      expect(mockWorkoutRepo.getStatsByPeriod).toHaveBeenCalled();
    });

    it("should default to week period if not specified", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockWorkoutRepo.getStatsByPeriod.mockResolvedValue({});

      await service.getWorkoutStats();

      expect(mockWorkoutRepo.getStatsByPeriod).toHaveBeenCalled();
    });
  });
});
