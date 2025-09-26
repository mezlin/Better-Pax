import express from 'express';

const app = express();
const port = 3001;

app.get('/', (req, res) => {
    res.send('API is running');
});

app.listen(port, () => {
    console.log(`API server is running at http://localhost:${port}`);
});