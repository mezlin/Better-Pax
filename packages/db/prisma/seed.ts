// packages/db/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

// Initialize the Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding process...');

  // First, clean up existing data to ensure a fresh start
  await prisma.territory.deleteMany({});
  await prisma.faction.deleteMany({});
  await prisma.scenario.deleteMany({});

  // 1. Create a Scenario
  const napoleonicScenario = await prisma.scenario.create({
    data: {
      name: 'Napoleonic Europe - 1805',
      description: "The height of Napoleon's power, just before the Battle of Austerlitz.",
      start_year: 1805,
    },
  });
  console.log(`Created scenario: ${napoleonicScenario.name}`);

  // 2. Create Factions linked to the Scenario
  const france = await prisma.faction.create({
    data: {
      name: 'French Empire',
      color: '#0033CC', // Blue
      personality_profile: 'You are Napoleon Bonaparte. You are ambitious, brilliant, and ruthless. Your goal is to dominate Europe and spread the ideals of the French Revolution. You see Austria as a primary obstacle.',
      scenarioId: napoleonicScenario.id, // Link to the scenario
    },
  });

  const austria = await prisma.faction.create({
    data: {
      name: 'Austrian Empire',
      color: '#EFEFEF', // White
      personality_profile: 'You are Emperor Francis I of Austria. You are a conservative monarch, wary of Napoleon\'s revolutionary ideas. Your primary goal is to preserve the balance of power and the integrity of your empire.',
      scenarioId: napoleonicScenario.id, // Link to the scenario
    },
  });
  console.log(`Created factions: ${france.name}, ${austria.name}`);

  // 3. Create Territories linked to the Factions
  // NOTE: These are simplified placeholder polygons for testing.
  // In a real game, this GeoJSON data would be much more detailed.
  await prisma.territory.create({
    data: {
      name: 'Ile-de-France',
      scenarioId: napoleonicScenario.id,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[2.35, 48.85], [2.40, 48.85], [2.40, 48.90], [2.35, 48.90], [2.35, 48.85]]
        ],
      },
    },
  });

  await prisma.territory.create({
    data: {
      name: 'Vienna',
      scenarioId: napoleonicScenario.id,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[16.37, 48.20], [16.42, 48.20], [16.42, 48.25], [16.37, 48.25], [16.37, 48.20]]
        ],
      },
    },
  });
  console.log('Created territories.');

  console.log('Seeding finished successfully.');
}

// Run the main function and handle potential errors
main()
  .catch((e) => {
    console.error('An error occurred during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ensure the Prisma Client disconnects after the script runs
    await prisma.$disconnect();
  });