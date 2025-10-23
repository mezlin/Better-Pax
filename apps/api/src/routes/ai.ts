import {Router} from 'express';
import {PrismaClient} from '@prisma/client';
import {Ollama} from 'ollama';

const prisma = new PrismaClient();
const router = Router();
const ollama = new Ollama({host: 'http://localhost:11434'});

router.post('/:gameId/counselor', async (req, res) => {
    const {gameId} = req.params;
    const {question} = req.body;

    if(!question) {
        return res.status(400).json({error: 'No question provided'});
    }

    try {
        const gameState = await prisma.gameState.findUnique({
            where: {gameId: gameId},
            include: {
                game: {include: {playedFaction: true, state: true}},
            }
        })

        if(!gameState || !gameState.game) {
            return res.status(404).json({error: 'Game not found'});
        }

        const faction = gameState.game.playedFaction;
        if (!faction) {
            return res.status(404).json({error: 'Played faction not found'});   
        }

        //Initial prompt to set context for the Counselor
        const counselorPrompt = `You are an advisor to the leader of ${faction.name}. The current date is ${gameState.currentDate.toDateString()}. 
                                \nThe turn number is ${gameState.turn_number}. Provide strategic advice to help the faction succeed.
                                \nThe personality of the leader is ${faction.personality_profile}.
                                \nProvide a thoughtful and strategic response.`;

        //Full prompt with question
        const fullPrompt = `${counselorPrompt}\n This is your leader's question: ${question}`;

        //Prepare the response as a stream
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        //Call to Ollama API to get response
        const counselorResponse = await ollama.chat({
            model: 'llama3.1:8b',
            messages: [
                {
                    role: 'system',
                    content: counselorPrompt
                },
                {
                    role: 'user',
                    content: fullPrompt
                }
            ],
            stream: true,
        });

        for await (const chunk of counselorResponse) {
            res.write(chunk.message.content);
        }

        res.end();
    
    }catch (error) {
        console.error('Failed to get counselor response:', error);
        res.status(500).json({error: 'Internal server error'});
    }
})

export default router;
