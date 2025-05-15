'use client';

import { useState } from 'react';

export type ModelProvider = 'openai' | 'anthropic' | 'mistral' | 'google';
export type ModelOption = {
  provider: ModelProvider;
  model: string;
  displayName: string;
  supportsPDF?: boolean;
};

const modelOptions: ModelOption[] = [
  { provider: 'openai', model: 'gpt-4o', displayName: 'OpenAI GPT-4o', supportsPDF: true },
  { provider: 'openai', model: 'o4-mini', displayName: 'OpenAI o4-mini Reasoning', supportsPDF: true },
  { provider: 'anthropic', model: 'claude-3-7-sonnet-20250219', displayName: 'Anthropic Claude 3.7 Sonnet', supportsPDF: true },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', displayName: 'Anthropic Claude 3.5 Sonnet', supportsPDF: true },
  { provider: 'mistral', model: 'mistral-large-latest', displayName: 'Mistral Large', supportsPDF: false },
  { provider: 'mistral', model: 'mistral-medium-latest', displayName: 'Mistral Medium', supportsPDF: false },
  { provider: 'mistral', model: 'mistral-small-latest', displayName: 'Mistral Small', supportsPDF: false },
  { provider: 'google', model: 'gemini-1.5-pro', displayName: 'Google Gemini 1.5 Pro', supportsPDF: false },
];

// Filter models to include only those that support PDF
export const pdfSupportedModels = modelOptions.filter(model => model.supportsPDF);

interface ModelSelectorProps {
  onModelSelect: (modelOption: ModelOption) => void;
  pdfOnly?: boolean;
}

export default function ModelSelector({ onModelSelect, pdfOnly = true }: ModelSelectorProps) {
  const availableModels = pdfOnly ? pdfSupportedModels : modelOptions;
  const [selectedModel, setSelectedModel] = useState<ModelOption>(availableModels[0]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [provider, model] = value.split('|');
    const modelOption = availableModels.find(
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
        {availableModels.map((option) => (
          <option 
            key={`${option.provider}-${option.model}`} 
            value={`${option.provider}|${option.model}`}
          >
            {option.displayName}
          </option>
        ))}
      </select>
      {pdfOnly && (
        <p className="text-xs text-gray-500 mt-1">
          Only showing models that support PDF analysis
        </p>
      )}
    </div>
  );
} 