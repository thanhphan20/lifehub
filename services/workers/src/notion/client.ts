import { Client } from "@notionhq/client";
import logger from "../shared/logger";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  timeoutMs: 5000,
});

const databaseId = process.env.NOTION_DB_ID;

export async function createWorkoutEntry(data: any, correlationId: string) {
  if (!databaseId) {
    throw new Error("NOTION_DB_ID is not defined");
  }

  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: data.type } }] },
        Sets: { number: data.sets },
        Reps: { number: data.reps },
        Weight: { number: data.weight },
        Date: { date: { start: new Date().toISOString() } },
      },
    });
    logger.info("Created Notion workout entry", {
      id: response.id,
      correlationId,
    });
    return response;
  } catch (err: any) {
    logger.error("Failed to create Notion workout entry", {
      error: err.message,
      correlationId,
    });
    throw err;
  }
}

export async function syncToNotionEnriched(event: any) {
  if (!databaseId) {
    throw new Error("NOTION_DB_ID is not defined");
  }

  const { domain, data, correlationId } = event;
  let properties: any = {};

  if (domain === "nutrition") {
    properties = {
      Name: { title: [{ text: { content: data.description } }] },
      Calories: { number: data.calories },
      Protein: { number: data.protein },
      Carbs: { number: data.carbs },
      Fat: { number: data.fat },
      Date: { date: { start: data.date } },
    };
  } else if (domain === "workout") {
    properties = {
      Name: { title: [{ text: { content: data.type } }] },
      Sets: { number: data.sets },
      Reps: { number: data.reps },
      Weight: { number: data.weight },
      Date: { date: { start: new Date().toISOString().split("T")[0] } },
    };
  }

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });

  logger.info("Synced enriched event to Notion", {
    id: response.id,
    domain,
    correlationId,
  });
  return response;
}

export default notion;
