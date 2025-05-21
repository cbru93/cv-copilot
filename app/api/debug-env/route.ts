import { NextRequest, NextResponse } from 'next/server';
import { config } from '../config';

export async function GET(req: NextRequest) {
  // Only include non-sensitive information
  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    openaiKeyExists: !!process.env.OPENAI_API_KEY,
    openaiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
    anthropicKeyExists: !!process.env.ANTHROPIC_API_KEY,
    mistralKeyExists: !!process.env.MISTRAL_API_KEY,
    googleKeyExists: !!process.env.GOOGLE_API_KEY,
    
    // Check configured keys from config
    configOpenaiKeyExists: !!config.openai.apiKey,
    configOpenaiKeyLength: config.openai.apiKey?.length || 0,
    configAnthropicKeyExists: !!config.anthropic.apiKey,
    
    // Server info
    timestamp: new Date().toISOString(),
    serverTime: new Date().toString(),
  };
  
  // Return environment info
  return NextResponse.json(envInfo);
} 