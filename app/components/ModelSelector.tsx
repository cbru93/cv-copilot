'use client';

import { useState } from 'react';

export type ModelProvider = 'openai' | 'anthropic' | 'mistral' | 'google';
export type ModelOption = {
  provider: ModelProvider;
  model: string;
  displayName: string;
};

const modelOptions: ModelOption[] = [
  { provider: 'openai', model: 'gpt-4o', displayName: 'OpenAI GPT-4o' },
  { provider: 'openai', model: 'gpt-3.5-turbo', displayName: 'OpenAI GPT-3.5 Turbo' },
  { provider: 'anthropic', model: 'claude-3-opus-20240229', displayName: 'Anthropic Claude 3 Opus' },
  { provider: 'anthropic', model: 'claude-3-sonnet-20240229', displayName: 'Anthropic Claude 3 Sonnet' },
  { provider: 'anthropic', model: 'claude-3-haiku-20240307', displayName: 'Anthropic Claude 3 Haiku' },
  { provider: 'mistral', model: 'mistral-large-latest', displayName: 'Mistral Large' },
  { provider: 'mistral', model: 'mistral-medium-latest', displayName: 'Mistral Medium' },
  { provider: 'mistral', model: 'mistral-small-latest', displayName: 'Mistral Small' },
  { provider: 'google', model: 'gemini-1.5-pro', displayName: 'Google Gemini 1.5 Pro' },
];

interface ModelSelectorProps {
  onModelSelect: (modelOption: ModelOption) => void;
}

export default function ModelSelector({ onModelSelect }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<ModelOption>(modelOptions[0]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [provider, model] = value.split('|');
    const modelOption = modelOptions.find(
      option => option.provider === provider && option.model === model
    );
    
    if (modelOption) {
      setSelectedModel(modelOption);
      onModelSelect(modelOption);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="model-selector" className="block text-sm font-medium">
        Select AI Model
      </label>
      <select
        id="model-selector"
        value={`${selectedModel.provider}|${selectedModel.model}`}
        onChange={handleModelChange}
        className="w-full p-2 border border-gray-300 rounded-md"
      >
        {modelOptions.map((option) => (
          <option 
            key={`${option.provider}-${option.model}`} 
            value={`${option.provider}|${option.model}`}
          >
            {option.displayName}
          </option>
        ))}
      </select>
    </div>
  );
} 