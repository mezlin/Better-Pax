// packages/db/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Initialize the Prisma Client
const prisma = new PrismaClient();

// Helper function to create a URL-friendly "slug" from a territory name
function createSlug(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize("NFD") // Handle accented characters like 'é'
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric characters
    .trim()
    .replace(/\s+/g, "-"); // Replace spaces with hyphens
}


async function main() {
  console.log('Start seeding process...');

  // 1. Create a Scenario
  const ww2Scenario = await prisma.scenario.upsert({
    where: { id: 'world-war-ii' },
    update: {},
    create: {
      name: 'World War II',
      description: 'The world on the brink of war. Germany has invaded Poland, and the major powers are choosing their sides.',
      start_year: 1939,
    }
  });
  console.log(`Ensured scenario: ${ww2Scenario.name}`);

  // 2. Create Factions linked to the Scenario
  //We'll create the main Axis and Allied powers.

  // ---AXIS POWERS---
const germany = await prisma.faction.upsert({
    where: { id: 'german-reich' },
    update: {},
    create: {
      name: 'German Reich',
      color: '#424242', // Field Gray
      personality_profile: 'You are the leader of the German Reich. Your nation is highly industrialized with a powerful, modern army. You are driven by an aggressive expansionist ideology to secure "Lebensraum" (living space) and dominate the European continent.',
      scenarioId: ww2Scenario.id,
    },
  });

  const italy = await prisma.faction.upsert({
    where: { id: 'italy' },
    update: {},
    create: {
      name: 'Italy',
      color: '#006400', // Dark Green
      personality_profile: 'You are the leader of Fascist Italy. You dream of restoring the glory of the Roman Empire by controlling the Mediterranean ("Mare Nostrum"). Your military is large but technologically inconsistent. You are a key ally of Germany.',
      scenarioId: ww2Scenario.id,
    },
  });

  // --- ALLIED POWERS ---
  const usa = await prisma.faction.upsert({
    where: { id: 'united-states'},
    update: {},
    create: {
      name: 'United States',
      color: '#3C3B6E', // Navy Blue
      personality_profile: 'You are the leader of the United States of America. Your nation is geographically isolated from the European conflict and has a powerful economy and navy. You are initially neutral but sympathetic to the Allied cause, especially after Germany\'s aggression in Europe.',
      scenarioId: ww2Scenario.id,
    }
  });

  const uk = await prisma.faction.upsert({
    where: { id: 'united-kingdom' },
    update: {},
    create: {
      name: 'United Kingdom',
      color: '#CF142B', // Red
      personality_profile: 'You lead a global colonial empire with the world\'s most powerful navy. Your primary goal is to maintain the balance of power in Europe and protect your empire. You have guaranteed Poland\'s independence and are now at war with Germany.',
      scenarioId: ww2Scenario.id,
    },
  });
  
  const france = await prisma.faction.upsert({
    where: { id: 'french-republic' },
    update: {},
    create: {
      name: 'French Republic',
      color: '#002395', // French Blue
      personality_profile: 'You lead a nation with a large, reputable army, but you are politically divided and scarred by the memory of the Great War. Your strategy is defensive, relying on the Maginot Line to protect you from German aggression. You are allied with the UK.',
      scenarioId: ww2Scenario.id,
    },
  });

  const ussr = await prisma.faction.upsert({
    where: { id: 'soviet-union' },
    update: {},
    create: {
      name: 'Soviet Union',
      color: '#CC0000', // Red
      personality_profile: 'You are the leader of the vast and populous Soviet Union. You are ideologically opposed to both the fascists and the Western democracies. You have just signed a non-aggression pact with Germany to buy time and secure your western borders. You are an unpredictable opportunist.',
      scenarioId: ww2Scenario.id,
    },
  });

  // ---OTHER FACTIONS---
  const spain = await prisma.faction.upsert({
    where: { id: 'spain' },
    update: {},
    create: {
      name: 'Spain',
      color: '#F1C40F', //Yellow
      personality_profile: 'You are the leader of Spain, a nation recovering from a brutal civil war. Officially neutral, you are sympathetic to the Axis powers due to their support during your civil war. However, you must balance this with the need to rebuild your country and avoid further conflict.',
      scenarioId: ww2Scenario.id,
    }
  });

  console.log(`Ensured major factions exist.`);

  // 3. Create Territories linked to the Factions
  const geojsonFiles = [
    'MapsData/Europe_WW2.geojson',
    'MapsData/NA_WW2.geojson',
    'MapsData/Africa_WW2.geojson',
    'MapsData/Asia_WW2.geojson',
    'MapsData/Greenland_WW2.geojson',
    'MapsData/Scand_WW2.geojson',
    'MapsData/Antartica_WW2.geojson',
  ];

  let territoriesSeeded = 0;
  const processedSlugs = new Set<string>();

  //4. Loop through each GeoJSON file and create the territories
  for (const fileName of geojsonFiles) {
    const geojsonPath = path.join(__dirname, fileName);

    if(!fs.existsSync(geojsonPath)) {
        console.warn(`GeoJSON file not found: ${fileName}`);
        continue;
    }
    console.log(`Processing file: ${fileName}`);

    const fileContent = fs.readFileSync(geojsonPath, 'utf-8');
    const geojsonData = JSON.parse(fileContent);

    for (const feature of geojsonData.features) {
      const territoryName = feature.properties.name;
      if(!territoryName) continue;

      const territorySlug = createSlug(territoryName);

      //Check if territory with this slug already exists
      if(processedSlugs.has(territorySlug)) {
        throw new Error(`Duplicate territory slug detected: ${territorySlug} from file ${fileName}`);
      }

      await prisma.territory.create({
        data: {
          name: territoryName,
          slug: territorySlug,
          scenarioId: ww2Scenario.id,
          geometry: feature,
        },
      });

      processedSlugs.add(territorySlug);
    }
    territoriesSeeded += geojsonData.features.length;
    console.log(`Seeded ${geojsonData.features.length} territories from ${fileName}.`);
  }
  console.log(`Total territories seeded: ${territoriesSeeded}`);

  // Create a test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      hashed_password: 'hashedpassword123', // In a real app, use a proper hashing function*
      created_at: new Date(),
    },
  });

  //Mapping for faction assignments based on territory codding/names
  const ownerCodeToFactionId = new Map<string, string>([
    ['DE', germany.id],
    ['IT', italy.id],
    ['UK', uk.id],
    ['FR', france.id],
    ['Russia', ussr.id],
    ['ES', spain.id],
    ['United States of America', usa.id],
  ])

  //Get all territories
  const allTerritories = await prisma.territory.findMany({
    where: { scenarioId: ww2Scenario.id },
  });

  const initialOwnership: {[key: string]: string} = {};

  for (const territory of allTerritories) {
    const territoryName = territory.name;
    let ownerCode = '';

    if (territoryName.includes('_')) {
      ownerCode = territoryName.split('_')[0];
    }
    else {
      ownerCode = territoryName;
    }

    const factionId = ownerCodeToFactionId.get(ownerCode);
    if (factionId) {
      initialOwnership[territory.id] = factionId;
    }
  }

  //Create a test Game
  const testGame = await prisma.game.upsert({
    where: {id: 'test-game-1'},
    update: {},
    create: {
      id: 'test-game-1',
      userId: testUser.id,
      scenarioId: ww2Scenario.id,
      playedFactionId: germany.id,
      created_at: new Date(),
      state: {
        create: {
          turn_number: 1,
          currentDate: new Date('1939-09-01'),
          territories: initialOwnership,
          diplo_status: {}
        }
      }
    }
  });

  console.log(`Created a test game for user ${testUser.name} with ID: ${testGame.id}.`);

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