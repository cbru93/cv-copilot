// Configuration for API providers
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || '',
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
  },
};

// Check if a provider's API key is available
export function isProviderAvailable(provider: 'openai' | 'anthropic' | 'mistral' | 'google'): boolean {
  return !!config[provider].apiKey;
} 