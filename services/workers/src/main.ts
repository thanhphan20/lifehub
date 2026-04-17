import * as dotenv from "dotenv";
import logger from "./shared/logger";
import { startAnalyticsWorker } from "./analytics";
import { startNotionWorker } from "./notion";
import { startIntegrationWorker } from "./integration";

dotenv.config();

const workerType = process.argv[2] || process.env.WORKER_TYPE || "all";

async function main() {
  logger.info(`🚀 Starting LifeHub Workers (Mode: ${workerType})`);

  const workers: Promise<void>[] = [];

  if (workerType === "all" || workerType === "analytics") {
    workers.push(startAnalyticsWorker());
  }

  if (workerType === "all" || workerType === "notion") {
    workers.push(startNotionWorker());
  }

  if (workerType === "all" || workerType === "integration") {
    workers.push(startIntegrationWorker());
  }

  if (workers.length === 0) {
    logger.error(`❌ No valid worker type specified: ${workerType}`);
    process.exit(1);
  }

  await Promise.all(workers);
}

main().catch((err) => {
  logger.error("💥 Fatal error in main orchestrator:", err);
  process.exit(1);
});
