import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/:gameId/factions', async (req, res) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(400).json({ error: 'Game ID is required' });
  }

  try {
    // This query calculates the best label position for each faction.
    const factionLabels: any[] = await prisma.$queryRaw(Prisma.sql`
      WITH GameOwnership AS (
        -- Step 1: Unpack the ownership JSON from the GameState table
        SELECT key AS territory_id, value AS faction_id
        FROM "GameState", jsonb_each_text(territories)
        WHERE "gameId" = ${gameId}
      ),
      ClusteredTerritories AS (
        -- Step 2: Identify contiguous "blobs" of land for each faction.
        SELECT
          t.id,
          go.faction_id,
          ST_GeomFromGeoJSON(t.geometry ->> 'geometry') as geom,
          -- This function groups touching territories. Each separate blob gets a unique cluster_id.
          ST_ClusterDBSCAN(ST_GeomFromGeoJSON(t.geometry ->> 'geometry'), eps := 0, minpoints := 1) OVER (PARTITION BY go.faction_id) as cluster_id
        FROM "Territory" t
        JOIN GameOwnership go ON t.id = go.territory_id
      ),
      ClusteredGeometries AS (
        -- Step 3: Merge the geometries for each blob.
        SELECT
          ct.faction_id,
          ct.cluster_id,
          ST_Union(ST_Transform(ct.geom, 3857)) AS merged_geom_mercator
        FROM ClusteredTerritories ct
        GROUP BY ct.faction_id, ct.cluster_id
      )
       -- Step 4: Calculate the best label point for EACH blob.
      SELECT
        f.id,
        f.name,
        ST_AsGeoJSON(
          ST_Transform(
            CASE
              WHEN ST_Contains(cg.merged_geom_mercator, ST_Centroid(cg.merged_geom_mercator))
              THEN ST_Centroid(cg.merged_geom_mercator)
              ELSE ST_PointOnSurface(cg.merged_geom_mercator)
            END,
            4326
          )
        )::json AS geometry
      FROM ClusteredGeometries cg
      JOIN "Faction" f ON f.id = cg.faction_id;
    `);

    // Step 5: Format the result into a GeoJSON FeatureCollection.
    const featureCollection = {
      type: 'FeatureCollection',
      features: factionLabels.map(label => ({
        type: 'Feature',
        geometry: label.geometry,
        properties: {
          name: label.name.toUpperCase(),
        },
      })),
    };

    res.json(featureCollection);

  } catch (error) {
    console.error('Failed to fetch faction label data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

