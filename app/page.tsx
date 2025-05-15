'use client';

import { useState } from 'react';
import FileUpload from './components/FileUpload';
import ModelSelector, { ModelOption } from './components/ModelSelector';
import AnalysisResults from './components/AnalysisResults';
import { defaultChecklistContent } from './utils/fileParser';
import DesignSystemTest from './components/DesignSystemTest';
import { 
  Heading, 
  Button, 
  Alert, 
  Card,
  CardBlock,
  Radio, 
  Paragraph,
  Divider
} from '@digdir/designsystemet-react';

export default function Home() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [checklistText, setChecklistText] = useState<string>(defaultChecklistContent);
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'OpenAI GPT-4o'
  });
  const [analysisType, setAnalysisType] = useState<'summary' | 'assignments' | 'agent_evaluation'>('summary');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDesignSystem, setShowDesignSystem] = useState<boolean>(false);

  const handleCVUpload = (file: File) => {
    setError(null);
    setCvFile(file);
  };

  const handleChecklistUpload = async (file: File) => {
    try {
      setError(null);
      const text = await file.text();
      setChecklistText(text);
    } catch (err) {
      setError('Failed to parse checklist file. Please make sure it is a valid text file.');
      console.error(err);
    }
  };

  const handleAnalysisTypeChange = (type: 'summary' | 'assignments' | 'agent_evaluation') => {
    setAnalysisType(type);
  };

  const handleAnalyze = async () => {
    if (!cvFile) {
      setError('Please upload a CV file first.');
      return;
    }

    // Check if selected model provider supports PDF
    if (selectedModel.provider !== 'openai' && selectedModel.provider !== 'anthropic') {
      setError('Selected model provider does not support PDF analysis. Please choose OpenAI or Anthropic.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult('');

      const formData = new FormData();
      formData.append('file', cvFile);
      formData.append('checklistText', checklistText);
      formData.append('analysisType', analysisType);
      formData.append('modelProvider', selectedModel.provider);
      formData.append('modelName', selectedModel.model);

      // Choose the appropriate endpoint based on analysis type
      const endpoint = analysisType === 'agent_evaluation' 
        ? '/api/agent-cv-evaluation' 
        : '/api/analyze-cv';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to analyze CV: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Different endpoints return different structures
      if (analysisType === 'agent_evaluation') {
        // Check if the result is structured or not (Anthropic vs OpenAI)
        if (data.isStructured === false) {
          // For Anthropic, we get plain text
          setResult(data.result);
        } else {
          // For OpenAI, we get structured data
          setResult(data.result);
        }
      } else {
        setResult(data.result);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during analysis. Please try again.');
      }
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">CV Enhancement Tool</h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Improve your CV with AI-powered analysis based on company guidelines. Upload your CV, select an analysis type, and get personalized recommendations.
          </p>
          <Button 
            variant="primary"
            onClick={() => setShowDesignSystem(!showDesignSystem)}
            className="mt-4"
          >
            {showDesignSystem ? 'Hide' : 'Show'} Design System Components
          </Button>
        </div>

        {showDesignSystem && (
          <Card className="mb-8">
            <Card.Block>
              <Heading level={2} data-size="sm">Design System Demo</Heading>
            </Card.Block>
            <Card.Block>
              <DesignSystemTest />
            </Card.Block>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-4">Upload Files</h2>
            <FileUpload 
              onCVUpload={handleCVUpload} 
              onChecklistUpload={handleChecklistUpload} 
            />
            
            <div className="mt-6 space-y-4">
              <ModelSelector onModelSelect={setSelectedModel} />
              
              <div className="space-y-2">
                <h3 className="text-md font-medium">Analysis Type</h3>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="analysisType"
                      checked={analysisType === 'summary'}
                      onChange={() => handleAnalysisTypeChange('summary')}
                      className="h-4 w-4"
                    />
                    <span>CV Summary</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="analysisType"
                      checked={analysisType === 'assignments'}
                      onChange={() => handleAnalysisTypeChange('assignments')}
                      className="h-4 w-4"
                    />
                    <span>Key Assignments</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="analysisType"
                      checked={analysisType === 'agent_evaluation'}
                      onChange={() => handleAnalysisTypeChange('agent_evaluation')}
                      className="h-4 w-4"
                    />
                    <span>Agent-based CV Evaluation</span>
                  </label>
                  
                  {analysisType === 'agent_evaluation' && (
                    <div className="mt-2 px-3 py-2 bg-blue-50 text-blue-800 text-xs rounded">
                      <p><strong>Note:</strong> Agent-based evaluation works best with OpenAI models (GPT-4 recommended). This feature uses multiple AI agents to provide detailed ratings across different CV criteria.</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!cvFile || isLoading}
                className={`w-full py-2 px-4 rounded-md ${
                  !cvFile || isLoading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } transition`}
              >
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </button>

              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg shadow-sm">
            <AnalysisResults result={result} isLoading={isLoading} />
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-gray-500">
          <p>
            Built with Next.js and the Vercel AI SDK. Upload your CV and checklist to get started.
          </p>
        </div>
      </div>
    </main>
  );
}
