import { PrismaClient } from "../src/generated/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient({
  log: [], // tắt log cho nhanh
});

// config
const TOTAL = 200_000;
const CHUNK_SIZE = 10_000;

function generateBatch(count: number) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      type: faker.helpers.arrayElement([
        "Bench Press",
        "Squat",
        "Deadlift",
        "Pull Up",
        "Shoulder Press",
        "Leg Press",
        "Barbell Row",
        "Incline Bench",
      ]),
      sets: faker.number.int({ min: 3, max: 6 }),
      reps: faker.number.int({ min: 5, max: 15 }),
      weight: faker.number.int({ min: 20, max: 200 }),
    });
  }
  return data;
}

async function main() {
  console.log(`🚀 Seeding ${TOTAL.toLocaleString()} workout records...`);
  const start = Date.now();

  let inserted = 0;

  while (inserted < TOTAL) {
    const remaining = TOTAL - inserted;
    const currentChunk = Math.min(CHUNK_SIZE, remaining);

    console.log(`📦 Inserting: ${(inserted + currentChunk).toLocaleString()}/${TOTAL.toLocaleString()}`);

    const batch = generateBatch(currentChunk);

    await prisma.workoutLog.createMany({
      data: batch,
      skipDuplicates: true,
    });

    inserted += currentChunk;
  }

  const end = Date.now();
  console.log(`✨ Done in ${(end - start) / 1000}s`);
}

main()
  .catch((err) => {
    console.error("❌ ERROR:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
