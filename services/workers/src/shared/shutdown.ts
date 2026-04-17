import logger from "./logger";

export async function handleShutdown(
  resources: { disconnect: () => Promise<void> | void }[],
) {
  const shutdown = async () => {
    logger.info("SIGTERM/SIGINT received, shutting down gracefully...");
    for (const resource of resources) {
      try {
        await resource.disconnect();
      } catch (error) {
        logger.error("Error during resource disconnection:", error);
      }
    }
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
