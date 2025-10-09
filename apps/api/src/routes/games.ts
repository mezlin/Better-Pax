import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// This endpoint will be /api/games/:gameId/map
router.get('/:gameId/map', async (req, res) => {
  const { gameId } = req.params;

  try {
    // 1. Fetch the current game state, which contains the ownership map
    const gameState = await prisma.gameState.findUnique({
      where: { gameId: gameId },
      include: {
        game: { include: { scenario: true } }, // Also fetch the related game and scenario info
      },
    });

    if (!gameState || !gameState.game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const scenarioId = gameState.game.scenarioId;
    const territoryStates = gameState.territories as Record<string, string>; // { territoryId: factionId }

    // 2. Fetch all factions and territories for this scenario
    const factions = await prisma.faction.findMany({ where: { scenarioId } });
    const territories = await prisma.territory.findMany({ where: { scenarioId } });

    // 3. Create a quick lookup map for faction colors
    const factionDataMap = new Map<string, {name: string, color: string}>();
    for (const faction of factions) {
      factionDataMap.set(faction.id, {name: faction.name, color: faction.color});
    }

    // 4. Build the final GeoJSON FeatureCollection
    const featureCollection = {
      type: 'FeatureCollection',
      features: territories.map(territory => {
        const ownerId = territoryStates[territory.id];
        const ownerData = ownerId ? factionDataMap.get(ownerId) : null;
        const feature = territory.geometry as any;

        
        // Add the dynamic game data to the properties
        feature.properties.ownerId = ownerId;
        feature.properties.ownerColor = ownerData ? ownerData.color : '#808080'; // Default gray if unowned
        feature.properties.ownerName = ownerData ? ownerData.name : 'Unowned';

        return feature;
      }),
    };

    res.json(featureCollection);
  } catch (error) {
    console.error('Failed to fetch game map data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;