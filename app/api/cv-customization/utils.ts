import { NextResponse } from 'next/server';

/**
 * Logs a debug message with an optional data object
 */
export const logDebug = (message: string, data?: any): string => {
  const logMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
  console.log(logMessage);
  return logMessage;
};

/**
 * Gets environment information for debugging
 */
export const getEnvironmentInfo = () => {
  return {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_REGION: process.env.VERCEL_REGION,
    OPENAI_API_KEY_SET: !!process.env.OPENAI_API_KEY,
    OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY?.length || 0
  };
};

/**
 * Gets response headers with CORS settings
 */
export const getResponseHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}; 