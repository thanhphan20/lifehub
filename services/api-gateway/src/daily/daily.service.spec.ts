import { Test, TestingModule } from "@nestjs/testing";
import { DailyService } from "./daily.service";
import { DailyRepository } from "./daily.repository";

describe("DailyService", () => {
  let service: DailyService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findByDate: jest.fn(),
      upsertByDate: jest.fn(),
      updateTodos: jest.fn(),
      updateSummary: jest.fn(),
      createLogWithOutbox: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyService,
        { provide: DailyRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<DailyService>(DailyService);
  });

  describe("addLog", () => {
    it("persists the log and emits a v1.daily.raw.ingest outbox event", async () => {
      const existingEntry = {
        todos: [],
        logs: [],
        summary: null,
      };
      mockRepo.findByDate.mockResolvedValue(existingEntry);
      mockRepo.upsertByDate.mockResolvedValue(existingEntry);
      mockRepo.createLogWithOutbox.mockImplementation(
        (date: any, log: any, existingLogs: any, event: any) => {
          expect(event.eventType).toBe("v1.daily.raw.ingest");
          expect(event.payload.domain).toBe("daily");
          expect(event.payload.type).toBe("raw.ingest");
          expect(event.payload.data.text).toBe("Ran 5k");
          return Promise.resolve(existingEntry);
        },
      );

      const result = await service.addLog({ text: "Ran 5k" });

      expect(result.log.text).toBe("Ran 5k");
      expect(result.log.id).toBeDefined();
      expect(mockRepo.createLogWithOutbox).toHaveBeenCalledTimes(1);
    });
  });
});
