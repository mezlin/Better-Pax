import cors from 'cors';
import express from 'express';
import scenariosRouter from './routes/scenarios';
import gamesRouter from './routes/games';
import factionsRouter from './routes/factions';
import aiRouter from './routes/ai';

const app = express();
const port = 3001;

app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
    res.send('API is running');
});

app.use('/api/scenarios', scenariosRouter);
app.use('/api/games', gamesRouter);
app.use('/api/games', factionsRouter);
app.use('/api/games', aiRouter);

app.listen(port, () => {
    console.log(`API server is running at http://localhost:${port}`);
});