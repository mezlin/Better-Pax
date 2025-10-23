'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';

// A type definition for a single chat message
type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function CounselorChat({ gameId }: { gameId: string }) {
  // State to hold the array of all chat messages
  const [messages, setMessages] = useState<Message[]>([]);
  // State to control the user's text input
  const [input, setInput] = useState('');
  // State to track if we're waiting for the AI to respond
  const [isLoading, setIsLoading] = useState(false);
  
  // A ref to the message container div to handle auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // This effect will run every time the 'messages' array changes
  useEffect(() => {
    // Automatically scroll to the bottom of the message list
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSubmit = async (e: FormEvent) => {
    // Prevent the default form submission which reloads the page
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 1. Add the user's message to the UI
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput(''); // Clear the input field
    setIsLoading(true);

    // 2. Prepare for the streaming response
    let assistantResponse = '';
    // Add an initial, empty message for the assistant that we will update
    setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: assistantResponse }]);

    try {
      // 3. Make the API call to your streaming endpoint
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/games/${gameId}/counselor`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input }),
      });

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // 4. Set up the tools to read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // 5. Read the stream chunk by chunk
      while (true) {
        const { value, done } = await reader.read();
        if (done) break; // The stream is finished

        // Convert the chunk to text and append it to our response string
        const chunk = decoder.decode(value);
        assistantResponse += chunk;

        // Update the content of the *last* message in the array (the assistant's)
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          newMessages[newMessages.length - 1].content = assistantResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Failed to get response from counselor:', error);
      // If an error occurs, update the assistant's message to show an error
       setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          newMessages[newMessages.length - 1].content = "Sorry, I'm having trouble connecting right now.";
          return newMessages;
        });
    } finally {
      // 6. Signal that the AI is done thinking
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute bottom-24 right-4 w-96 h-[500px] flex flex-col bg-gray-900 bg-opacity-80 backdrop-blur-sm text-white rounded-lg shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-bold text-lg">Strategic Counselor</h3>
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
        {/* Empty div to act as a scroll target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isLoading ? "Counselor is thinking..." : "Ask for advice..."}
            disabled={isLoading}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </form>
      </div>
    </div>
  );
}