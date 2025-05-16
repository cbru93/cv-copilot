'use client';

import { Select } from '@digdir/designsystemet-react';
import { useState, useEffect } from 'react';

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
  defaultProvider?: ModelProvider;
}

export default function ModelSelector({ 
  onModelSelect, 
  pdfOnly = true, 
  defaultProvider 
}: ModelSelectorProps) {
  const availableModels = pdfOnly ? pdfSupportedModels : modelOptions;
  
  // Filter by provider if specified
  const filteredModels = defaultProvider 
    ? availableModels.filter(model => model.provider === defaultProvider)
    : availableModels;
  
  // Select first model from filtered list or first available if none match
  const initialModel = filteredModels.length > 0 
    ? filteredModels[0] 
    : availableModels[0];
  
  const [selectedModel, setSelectedModel] = useState<ModelOption>(initialModel);

  // Update selected model when defaultProvider changes
  useEffect(() => {
    if (defaultProvider) {
      const providerModels = availableModels.filter(
        model => model.provider === defaultProvider
      );
      if (providerModels.length > 0) {
        setSelectedModel(providerModels[0]);
        onModelSelect(providerModels[0]);
      }
    }
  }, [defaultProvider, availableModels, onModelSelect]);

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
      <Select
        id="model-selector"
        value={`${selectedModel.provider}|${selectedModel.model}`}
        onChange={handleModelChange}
        className="w-full p-2 border border-gray-300 rounded-md"
      >
        {(defaultProvider ? filteredModels : availableModels).map((option) => (
          <option 
            key={`${option.provider}-${option.model}`} 
            value={`${option.provider}|${option.model}`}
          >
            {option.displayName}
          </option>
        ))}
      </Select>
      {pdfOnly && (
        <p className="text-xs text-gray-500 mt-1">
          Only showing models that support PDF analysis
          {defaultProvider && ` for ${defaultProvider}`}
        </p>
      )}
    </div>
  );
} 