'use client';

import { useState } from 'react';
import FileUpload from './components/FileUpload';
import ModelSelector, { ModelOption } from './components/ModelSelector';
import AnalysisResults from './components/AnalysisResults';
import { parsePDF, parseTextFile, defaultChecklistContent } from './utils/fileParser';
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
  const [cvText, setCvText] = useState<string>('');
  const [checklistText, setChecklistText] = useState<string>(defaultChecklistContent);
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'OpenAI GPT-4o'
  });
  const [analysisType, setAnalysisType] = useState<'summary' | 'assignments'>('summary');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDesignSystem, setShowDesignSystem] = useState<boolean>(false);

  const handleCVUpload = async (file: File) => {
    try {
      setError(null);
      const text = await parsePDF(file);
      setCvText(text);
    } catch (err) {
      setError('Failed to parse CV file. Please make sure it is a valid PDF.');
      console.error(err);
    }
  };

  const handleChecklistUpload = async (file: File) => {
    try {
      setError(null);
      const text = await parseTextFile(file);
      setChecklistText(text);
    } catch (err) {
      setError('Failed to parse checklist file. Please make sure it is a valid text file.');
      console.error(err);
    }
  };

  const handleAnalysisTypeChange = (type: 'summary' | 'assignments') => {
    setAnalysisType(type);
  };

  const handleAnalyze = async () => {
    if (!cvText) {
      setError('Please upload a CV file first.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult('');

      const response = await fetch('/api/analyze-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfText: cvText,
          checklistText,
          analysisType,
          modelProvider: selectedModel.provider,
          modelName: selectedModel.model,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze CV');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError('An error occurred during analysis. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Heading level={1} data-size="xl">
            CV Enhancement Tool
          </Heading>
          <Paragraph data-spacing className="text-center max-w-3xl mx-auto">
            Improve your CV with AI-powered analysis based on company guidelines. Upload your CV, select an analysis type, and get personalized recommendations.
          </Paragraph>
          <Button 
            variant="secondary"
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
              
              <Divider data-spacing />
              
              <div className="mt-6 space-y-4">
                <ModelSelector onModelSelect={setSelectedModel} />
                
                <div className="space-y-2">
                  <Heading level={3} data-size="xs">Analysis Type</Heading>
                  <div className="flex space-x-4">
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
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleAnalyze}
                  disabled={!cvText || isLoading}
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
          <Paragraph data-size="sm" data-color="subtle">
            Built with Next.js and the Vercel AI SDK. Upload your CV and checklist to get started.
          </Paragraph>
        </div>
      </div>
    </main>
  );
}
