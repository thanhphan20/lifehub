import { Test, TestingModule } from "@nestjs/testing";
import { WorkoutController } from "./workout.controller";
import { WorkoutService } from "./workout.service";
import { PrismaService } from "../prisma/prisma.service";
import { KafkaService } from "../adapters/kafka/kafka.service";
import { RabbitMQService } from "../adapters/rabbitmq/rabbitmq.service";

describe("WorkoutController", () => {
  let controller: WorkoutController;
  let service: WorkoutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkoutController],
      providers: [
        WorkoutService,
        {
          provide: PrismaService,
          useValue: {
            workoutLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
            },
            notionSyncStatus: {
              update: jest.fn(),
            },
          },
        },
        {
          provide: KafkaService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: RabbitMQService,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkoutController>(WorkoutController);
    service = module.get<WorkoutService>(WorkoutService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
