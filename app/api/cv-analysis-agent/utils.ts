// Utility functions for CV analysis agent

/**
 * Enhanced logging function
 */
export function logDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  return logMessage;
}

/**
 * Environment diagnostics function
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    openaiKeyExists: !!process.env.OPENAI_API_KEY,
    openaiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
    anthropicKeyExists: !!process.env.ANTHROPIC_API_KEY,
    maxDuration: 230, // We set to 230 seconds (Azure might enforce a lower limit)
  };
}

/**
 * Standard headers for API responses
 */
export function getResponseHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Content-Type': 'application/json'
  };
} 