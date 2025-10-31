'use client';

import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// A type definition for a single chat message
type Message = {
    role: 'user' | 'assistant';
    content: string;
};

// This component now takes factionId and factionName
type DiplomacyChatProps = {
    gameId: string;
    factionId: string;
    factionName: string;
    onClose: () => void;
};

export default function DiplomacyChat({ gameId, factionId, factionName, onClose }: DiplomacyChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        const newHistory = [...messages, userMessage];
        setMessages(newHistory); // Update the chat with the user's message
        setInput('');
        setIsLoading(true);

        let assistantResponse = '';
        // Add an initial, empty message for the assistant
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/chat/${factionId}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send the new message AND the previous history
                body: JSON.stringify({ message: input, history: messages }),
            });

            if (!response.body) throw new Error('Response body is null');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                assistantResponse += chunk;

                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = assistantResponse;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error('Failed to get response:', error);
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = "Sorry, I'm having trouble connecting right now.";
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
    };

    return (
        // This is a modal overlay that covers the whole screen
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 z-40 flex items-center justify-center ui-no-map-click">
            <div className="w-[500px] h-[700px] flex flex-col bg-gray-900 text-white rounded-lg shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    {/* Show who the player is talking to */}
                    <h3 className="font-bold text-lg">Diplomacy with: {factionName}</h3>
                    <button
                        onClick={handleClose}
                        title="Close Diplomacy"
                        className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Message History */}
                <div className="flex-1 p-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                    D </div>

                {/* Input Form */}
                <div className="p-4 border-t border-gray-700">
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={isLoading ? "Awaiting response..." : "Send a message..."}
                            disabled={isLoading}
                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}
