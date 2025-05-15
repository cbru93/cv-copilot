'use client';

import { useState } from 'react';
import FileUpload from './FileUpload';
import ModelSelector, { ModelOption } from './ModelSelector';
import AnalysisResults from './AnalysisResults';
import { defaultChecklistContent } from '../utils/fileParser';
import { analyzeCVAction } from '../actions/cvActions';
import { 
  Heading, 
  Alert, 
  Card,
  CardBlock,
  Radio, 
  Paragraph,
  Divider,
  Button
} from '@digdir/designsystemet-react';

export default function CVAnalyzer() {
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

      // Use the server action instead of direct fetch
      const { success, data, error: actionError } = await analyzeCVAction({
        file: cvFile,
        checklistText,
        analysisType,
        modelProvider: selectedModel.provider,
        modelName: selectedModel.model
      });

      if (!success) {
        throw new Error(actionError || 'Analysis failed');
      }
      
      setResult(data.result);
      
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
    <>
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
    </>
  );
} 