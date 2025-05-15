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
  Divider,
  Label,
  Switch,
  Tag
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
        const errorData = await response.json().catch(e => ({ 
          error: `Failed to parse error response: ${response.status} ${response.statusText}` 
        }));
        
        // If we're doing agent evaluation and get a 500 error, provide a more specific message
        if (analysisType === 'agent_evaluation' && response.status === 500) {
          throw new Error('The agent-based evaluation is currently experiencing issues in the deployed environment. Please try the "CV Summary" or "Key Assignments" analysis types instead.');
        }
        
        throw new Error(errorData.error || `Failed to analyze CV: ${response.status} ${response.statusText}`);
      }

      const data = await response.json().catch(e => {
        throw new Error(`Failed to parse response data: ${e.message}`);
      });
      
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
        setResult(err.message); // Set as result so our enhanced error component can display it
        setError(err.message);
      } else {
        const message = 'An error occurred during analysis. Please try again or try a different analysis type.';
        setResult(message);
        setError(message);
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
          <Heading level={1} data-size="xl">CV Enhancement Tool</Heading>
          <Paragraph data-size="md" className="max-w-3xl mx-auto">
            Improve your CV with AI-powered analysis based on company guidelines. Upload your CV, select an analysis type, and get personalized recommendations.
          </Paragraph>
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
          <Card className="col-span-1">
            <Card.Block>
              <Heading level={2} data-size="sm">Upload Files</Heading>
            </Card.Block>
            <Card.Block>
              <FileUpload 
                onCVUpload={handleCVUpload} 
                onChecklistUpload={handleChecklistUpload} 
              />
              
              <Divider data-spacing="true" className="my-4" />
              
              <div className="space-y-4">
                <ModelSelector onModelSelect={setSelectedModel} />
                
                <div className="space-y-2">
                  <Heading level={3} data-size="xs">Analysis Type</Heading>
                  <div className="flex flex-col space-y-2">
                    <Radio
                      name="analysisType"
                      value="summary"
                      checked={analysisType === 'summary'}
                      onChange={() => handleAnalysisTypeChange('summary')}
                      label="CV Summary"
                    />
                    <Radio
                      name="analysisType"
                      value="assignments" 
                      checked={analysisType === 'assignments'}
                      onChange={() => handleAnalysisTypeChange('assignments')}
                      label="Key Assignments"
                    />
                    <Radio
                      name="analysisType"
                      value="agent_evaluation"
                      checked={analysisType === 'agent_evaluation'}
                      onChange={() => handleAnalysisTypeChange('agent_evaluation')}
                      label="Agent-based CV Evaluation"
                    />
                    
                    {analysisType === 'agent_evaluation' && (
                      <Alert data-color="info" className="mt-2">
                        <Paragraph data-size="xs">
                          <strong>Note:</strong> Agent-based evaluation works best with OpenAI models (GPT-4 recommended). This feature uses multiple AI agents to provide detailed ratings across different CV criteria.
                        </Paragraph>
                      </Alert>
                    )}
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleAnalyze}
                  disabled={!cvFile || isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                </Button>

                {error && (
                  <Alert data-color="danger">
                    {error}
                  </Alert>
                )}
              </div>
            </Card.Block>
          </Card>

          <Card className="col-span-1 md:col-span-2">
            <Card.Block>
              <Heading level={2} data-size="sm">Analysis Results</Heading>
            </Card.Block>
            <Card.Block>
              <AnalysisResults result={result} isLoading={isLoading} />
            </Card.Block>
          </Card>
        </div>

        <div className="mt-10 text-center">
          <Paragraph data-size="xs" data-color="subtle">
            Built with Next.js and the Vercel AI SDK. Upload your CV and checklist to get started.
          </Paragraph>
        </div>
      </div>
    </main>
  );
}
