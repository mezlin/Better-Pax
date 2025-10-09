import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/:gameId/factions', async (req, res) => {
  const { gameId } = req.params;

  try {
    // First, fetch factions and their territories for the given gameId
    const factionsWithGeometry: any[] = await prisma.$queryRaw`
      SELECT
        f.id,
        f.name,
        -- ST_PointOnSurface guarantees the label point is INSIDE the territory,
        -- which is safer than a simple centroid for complex shapes.
        ST_AsGeoJSON(ST_PointOnSurface(ST_Union(t.geometry::geometry)))::json AS geometry
      FROM "Faction" AS f
      JOIN "Territory" AS t ON (t.geometry -> 'properties' ->> 'ownerId')::uuid = f.id
      -- This is a simplified join. A better approach would be to join through GameState.
      -- The above query is a placeholder; below is the correct version.
    `;

    const gameState = await prisma.gameState.findUnique({ where: { gameId } });
    if (!gameState) return res.status(404).json({ error: "Game not found" });

    const territoryStates = gameState.territories as Record<string, string>;

    const factionTerritories: Record<string, string[]> = {};
    for (const territoryId in territoryStates) {
        const factionId = territoryStates[territoryId];
        if (!factionTerritories[factionId]) {
            factionTerritories[factionId] = [];
        }
        factionTerritories[factionId].push(territoryId);
    }
    
    const factions = await prisma.faction.findMany({ where: { id: { in: Object.keys(factionTerritories) } }});
    const factionMap = new Map(factions.map(f => [f.id, f]));

    const labelFeatures = [];
    for (const factionId in factionTerritories) {
        const territoriesForFaction = await prisma.territory.findMany({
            where: { id: { in: factionTerritories[factionId] }}
        });

        // Create a GeoJSON FeatureCollection of all territories for this faction
        const territoryFeatures = territoriesForFaction.map(t => (t.geometry as any));
        const featureCollection = { type: "FeatureCollection", features: territoryFeatures };

        // PostGIS query to merge and find a label point
        const result: any[] = await prisma.$queryRaw`
            SELECT ST_AsGeoJSON(ST_PointOnSurface(ST_Collect(ST_GeomFromGeoJSON(geom))))::json as point
            FROM json_to_recordset(${JSON.stringify(featureCollection.features)}) as x(geom json)
        `;
        
        const faction = factionMap.get(factionId);
        if (result.length > 0 && faction) {
            labelFeatures.push({
                type: 'Feature',
                geometry: result[0].point,
                properties: {
                    name: faction.name.toUpperCase() // Make the name uppercase for style
                }
            });
        }
    }

    res.json({ type: 'FeatureCollection', features: labelFeatures });

  } catch (error) {
    console.error('Failed to fetch faction label data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;