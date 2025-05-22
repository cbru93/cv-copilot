'use client';

import { Button, Heading, Paragraph, Textarea } from '@digdir/designsystemet-react';
import { useState } from 'react';

export default function SimpleChatTest() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeTaken, setTimeTaken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    setLoading(true);
    setError('');
    setResponse('');
    
    try {
      console.log('Sending request to /api/simple-chat');
      const startTime = Date.now();
      
      const res = await fetch('/api/simple-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      const clientTimeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`API error: ${errorData.error || res.statusText}`);
      }
      
      const data = await res.json();
      setResponse(data.response);
      setTimeTaken(`Server: ${data.timeTaken}, Client: ${clientTimeTaken}s`);
    } catch (err) {
      console.error('Error testing simple chat:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <Heading data-size="lg" level={1}>Simple Chat Test</Heading>
      <Paragraph className="mb-4 text-gray-600">
        This is a simple test to verify API functionality without timeouts.
      </Paragraph>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label htmlFor="message" className="block mb-2">Message:</label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
            placeholder="Type a message to test the API..."
            rows={3}
          />
        </div>
        
        <Button
          type="submit"
          disabled={loading}
        //   className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </Button>
      </form>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <Paragraph><strong>Error:</strong> {error}</Paragraph>
        </div>
      )}
      
      {timeTaken && (
        <div className="mb-4 text-sm text-gray-500">
          <Paragraph>Time taken: {timeTaken}</Paragraph>
        </div>
      )}
      
      {response && (
        <div className="p-4 border border-gray-300 rounded bg-gray-50">
          <Heading data-size="md" level={2}>Response:</Heading>
          <Paragraph>{response}</Paragraph>
        </div>
      )}
    </div>
  );
} 