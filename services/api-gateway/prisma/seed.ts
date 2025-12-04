import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create sample workout logs
  const workouts = [
    {
      type: "Bench Press",
      sets: 4,
      reps: 8,
      weight: 80,
    },
    {
      type: "Squat",
      sets: 5,
      reps: 5,
      weight: 120,
    },
    {
      type: "Deadlift",
      sets: 4,
      reps: 6,
      weight: 150,
    },
  ];

  for (const workout of workouts) {
    const created = await prisma.workoutLog.create({
      data: {
        ...workout,
      },
    });
    console.log(`✅ Created workout log: ${created.type} (${created.id})`);
  }

  console.log("✨ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
