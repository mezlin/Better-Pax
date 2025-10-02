import {Router} from 'express';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/:id/map', async (req, res)=> {
    const {id} = req.params;

    try {
        const territories = await prisma.territory.findMany({
            where: {
                scenarioId: id,
            },
        });

        if (territories.length === 0) {
            return res.status(404).json({error: 'No territories found for this scenario'});
        }

        const featureCollection = {
            type: 'FeatureCollection',
            features: territories.map(territory => {
                return territory.geometry
            }),
        };

        res.json(featureCollection);

    } catch(e) {
        console.error('Failed to fetch territories:', e);
        res.status(500).json({error: 'An internal server error occurred'});
    }
});

export default router;

