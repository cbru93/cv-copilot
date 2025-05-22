import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { config, isProviderAvailable } from '../config';

// Set maximum duration - should help with timeouts
export const maxDuration = 60;

// For Edge Runtime
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('Starting simple chat test API call');
    
    const { message } = await req.json();
    console.log(`Received message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // Set the OpenAI API key
    process.env.OPENAI_API_KEY = config.openai.apiKey;
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key is not set');
      return NextResponse.json(
        { error: 'OpenAI API key is not available' },
        { status: 500 }
      );
    }
    
    // Use a simple model call without parallel processing
    const model = openai('gpt-4o');
    console.log('Model configured');
    
    const result = await generateText({
      model,
      prompt: message || 'Hello! This is a test message.',
      maxTokens: 100, // Keep response short
    });
    
    console.log(`Generated response in ${(Date.now() - startTime) / 1000}s`);
    
    // Return a simple response
    return NextResponse.json({ 
      response: result.text,
      timeTaken: `${(Date.now() - startTime) / 1000}s`,
    });
    
  } catch (error) {
    console.error('Error in simple chat API:', error);
    return NextResponse.json(
      { 
        error: 'Error processing chat request', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timeTaken: `${(Date.now() - startTime) / 1000}s` 
      },
      { status: 500 }
    );
  }
} 