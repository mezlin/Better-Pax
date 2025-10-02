import cors from 'cors';
import express from 'express';
import scenariosRouter from './routes/scenarios';

const app = express();
const port = 3001;

app.use(cors());

app.get('/', (req, res) => {
    res.send('API is running');
});

app.use('/api/scenarios', scenariosRouter);

app.listen(port, () => {
    console.log(`API server is running at http://localhost:${port}`);
});