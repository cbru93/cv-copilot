'use client';

import { useState } from 'react';
import FileUpload from './components/FileUpload';
import ModelSelector, { ModelOption } from './components/ModelSelector';
import AnalysisResults, { AnalysisType } from './components/AnalysisResults';
import { defaultSummaryChecklist, defaultAssignmentsChecklist } from './utils/checklistData';
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
  Tag,
  Textarea,
  Checkbox
} from '@digdir/designsystemet-react';

// Define the type for analysis type
// type AnalysisType = 'combined' | 'agent_evaluation';

export default function Home() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [summaryChecklistText, setSummaryChecklistText] = useState<string>(defaultSummaryChecklist);
  const [assignmentsChecklistText, setAssignmentsChecklistText] = useState<string>(defaultAssignmentsChecklist);
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'OpenAI GPT-4o'
  });
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>(['combined', 'agent_evaluation']);
  const [result, setResult] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDesignSystem, setShowDesignSystem] = useState<boolean>(false);
  const [editingChecklist, setEditingChecklist] = useState<boolean>(false);
  const [activeChecklist, setActiveChecklist] = useState<'summary' | 'assignments'>('summary');

  const handleCVUpload = (file: File) => {
    setError(null);
    setCvFile(file);
  };

  const handleAnalysisTypeToggle = (type: AnalysisType) => {
    setAnalysisTypes(prev => {
      if (prev.includes(type)) {
        // Don't allow unchecking if it would result in no analysis types selected
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleChecklistTypeChange = (type: 'summary' | 'assignments') => {
    setActiveChecklist(type);
  };

  const handleAnalyze = async () => {
    if (!cvFile) {
      setError('Please upload a CV file first.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult({});

      const combinedResults: any = {};

      // Run each selected analysis type
      for (const analysisType of analysisTypes) {
        console.log(`Starting analysis for type: ${analysisType}`);
        
        const formData = new FormData();
        formData.append('file', cvFile);
        formData.append('summaryChecklistText', summaryChecklistText);
        formData.append('assignmentsChecklistText', assignmentsChecklistText);
        formData.append('analysisType', analysisType);
        formData.append('modelProvider', selectedModel.provider);
        formData.append('modelName', selectedModel.model);

        // Both types now use the same endpoint
        const endpoint = '/api/analyze-cv';

        console.log(`Calling ${endpoint} with model: ${selectedModel.provider}/${selectedModel.model} for analysis type: ${analysisType}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        console.log(`Received response for ${analysisType} with status: ${response.status}`);

        // If the response is not OK
        if (!response.ok) {
          let errorData;
          
          // Try to parse the error response
          try {
            errorData = await response.json();
            console.log('Server error response:', errorData);
            
            // If we have debug logs, include them in the error message
            if (errorData.logs && Array.isArray(errorData.logs)) {
              const errorWithLogs = {
                error: errorData.error || `Failed to analyze CV: ${response.status}`,
                details: errorData.details || response.statusText,
                logs: errorData.logs
              };
              
              // Set the error in a format that the AnalysisResults component can display
              combinedResults[analysisType] = JSON.stringify(errorWithLogs);
              throw new Error(errorData.error || `Failed to analyze CV: ${response.status} ${response.statusText}`);
            }
          } catch (e: unknown) {
            // If parsing fails, create a basic error
            errorData = { 
              error: `Failed to parse error response: ${response.status} ${response.statusText}` 
            };
          }
          
          throw new Error(errorData.error || `Failed to analyze CV: ${response.status} ${response.statusText}`);
        }

        // Try to parse the response data
        let data;
        try {
          data = await response.json();
          console.log(`Server success response for ${analysisType}:`, data);
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown parsing error';
          throw new Error(`Failed to parse response data: ${errorMessage}`);
        }
        
        // Store the result for this analysis type
        combinedResults[analysisType] = data.isStructured ? data.result : data.result;
        console.log(`Saved result for ${analysisType}:`, combinedResults[analysisType]);
        
        // If the response includes information about which analysis was actually performed,
        // use that instead of what we requested (to handle redirects in the backend)
        if (data.analysisType && data.analysisType !== analysisType) {
          console.log(`API returned ${data.analysisType} instead of requested ${analysisType}`);
          // Move the result to the correct key
          combinedResults[data.analysisType] = combinedResults[analysisType];
          delete combinedResults[analysisType];
        }
        
        // For agent evaluation, we may need to unwrap the result
        if (analysisType === 'agent_evaluation' || data.analysisType === 'agent_evaluation') {
          const agentResult = combinedResults['agent_evaluation'];
          if (agentResult && typeof agentResult === 'object' && 'result' in agentResult) {
            console.log('Unwrapping nested result for agent evaluation');
            combinedResults['agent_evaluation'] = agentResult.result;
          }
        }
      }

      console.log('All analysis results:', combinedResults);
      setResult(combinedResults);
    } catch (err) {
      if (err instanceof Error) {
        if (Object.keys(result).length === 0) { // Only set the error if no results were collected
          setError(err.message);
        }
      } else {
        const message = 'An error occurred during analysis. Please try again or try a different analysis type.';
        setError(message);
      }
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChecklistEditing = () => {
    setEditingChecklist(!editingChecklist);
  };

  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Heading level={1} data-size="xl">CV Enhancement Tool</Heading>
          <Paragraph data-size="md" className="max-w-3xl mx-auto">
            Improve your CV with AI-powered analysis based on company guidelines. Upload your CV, select an analysis type, and get personalized recommendations.
          </Paragraph>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="col-span-1">
            <Card.Block>
              <Heading level={2} data-size="sm">Upload CV & Configure Analysis</Heading>
            </Card.Block>
            <Card.Block>
              <FileUpload 
                onCVUpload={handleCVUpload} 
                showChecklistUpload={false}
              />
              
              <Divider data-spacing="true" className="my-4" />
              
              <div className="space-y-4">
                <ModelSelector onModelSelect={setSelectedModel} defaultProvider="openai" />
                
                <div className="space-y-2">
                  <Heading level={3} data-size="xs">Analysis Types</Heading>
                  <div className="flex flex-col space-y-2">
                    <Checkbox
                      checked={analysisTypes.includes('combined')}
                      onChange={() => handleAnalysisTypeToggle('combined')}
                      label="Combined Analysis (Summary & Key Assignments)"
                    />
                    <Checkbox
                      checked={analysisTypes.includes('agent_evaluation')}
                      onChange={() => handleAnalysisTypeToggle('agent_evaluation')}
                      label="Agent-based CV Evaluation"
                    />
                    
                    {analysisTypes.includes('agent_evaluation') && (
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
            <Card.Block className="flex justify-between items-center">
              <Heading level={2} data-size="sm">
                CV Analysis Results
              </Heading>
              {analysisTypes.includes('combined') && (
                <div className="flex items-center">
                  <Button 
                    variant="secondary"
                    onClick={toggleChecklistEditing}
                  >
                    {editingChecklist ? 'Hide Checklist' : 'Edit Checklist'}
                  </Button>
                </div>
              )}
            </Card.Block>
            
            {editingChecklist && analysisTypes.includes('combined') && (
              <Card.Block>
                <div className="flex mb-4 space-x-4">
                  <Radio
                    name="checklistType"
                    value="summary"
                    checked={activeChecklist === 'summary'}
                    onChange={() => handleChecklistTypeChange('summary')}
                    label="Summary Checklist"
                  />
                  <Radio
                    name="checklistType"
                    value="assignments"
                    checked={activeChecklist === 'assignments'}
                    onChange={() => handleChecklistTypeChange('assignments')}
                    label="Key Assignments Checklist"
                  />
                </div>
                <Textarea
                  value={activeChecklist === 'summary' ? summaryChecklistText : assignmentsChecklistText}
                  onChange={(e) => {
                    if (activeChecklist === 'summary') {
                      setSummaryChecklistText(e.target.value);
                    } else {
                      setAssignmentsChecklistText(e.target.value);
                    }
                  }}
                  rows={10}
                  className="w-full my-2"
                />
              </Card.Block>
            )}
            
            <Card.Block>
              <AnalysisResults 
                result={result} 
                isLoading={isLoading} 
                analysisTypes={analysisTypes}
              />
            </Card.Block>
          </Card>
        </div>

        <div className="mt-10 text-center">
          <Paragraph data-size="xs" data-color="subtle">
            Built with Next.js and the Vercel AI SDK. Upload your CV to get started.
          </Paragraph>
        </div>
      </div>
    </main>
  );
}
