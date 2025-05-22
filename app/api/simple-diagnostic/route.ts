import { NextRequest, NextResponse } from 'next/server';
import { config } from '../config';

// Set up Azure-friendly headers
function getAzureFriendlyHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Content-Type': 'application/json',
    'Transfer-Encoding': 'chunked', 
    'Connection': 'keep-alive',
    'Content-Encoding': 'none'
  };
}

export async function GET(req: NextRequest) {
  // Only include non-sensitive information
  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    openaiKeyExists: !!process.env.OPENAI_API_KEY,
    openaiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
    anthropicKeyExists: !!process.env.ANTHROPIC_API_KEY,
    
    // Check configured keys from config
    configOpenaiKeyExists: !!config.openai.apiKey,
    configOpenaiKeyLength: config.openai.apiKey?.length || 0,
    configAnthropicKeyExists: !!config.anthropic.apiKey,
    
    // Request info
    headers: Object.fromEntries(req.headers),
    url: req.url,
    hostname: req.headers.get('host'),

    // Server info
    timestamp: new Date().toISOString(),
    serverTime: new Date().toString(),
  };
  
  // Return environment info with Azure-friendly headers
  return NextResponse.json(
    envInfo, 
    { headers: getAzureFriendlyHeaders() }
  );
} 