'use client';

import { useState } from 'react';
import FileUpload from './components/FileUpload';
import MultiFileUpload from './components/MultiFileUpload';
import ModelSelector, { ModelOption } from './components/ModelSelector';
import AnalysisResults, { AnalysisType } from './components/AnalysisResults';
import CustomizationResults from './components/CustomizationResults';
import CVCustomizationProgress from './components/CVCustomizationProgress';
import { 
  summaryChecklists, 
  assignmentsChecklists, 
  Checklist,
  defaultSummaryChecklist, 
  defaultAssignmentsChecklist 
} from './utils/checklistData';
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
  Select,
  useRadioGroup
} from '@digdir/designsystemet-react';

// Define the type for analysis mode
type AnalysisMode = 'cv_analysis' | 'cv_customization';

// Define the type for analysis type (for CV analysis mode)
type CVAnalysisType = 'combined' | 'agent_evaluation' | 'enhanced_agent';

export default function Home() {
  // Common state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'OpenAI GPT-4o'
  });
  const [result, setResult] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Analysis mode selection
  const analysisMode = useRadioGroup({
    value: 'cv_analysis',
    onChange: (value: string) => {
      // Reset results when switching modes
      setResult({});
      setError(null);
    }
  });

  // CV Analysis specific state
  const [summaryChecklistText, setSummaryChecklistText] = useState<string>(defaultSummaryChecklist);
  const [assignmentsChecklistText, setAssignmentsChecklistText] = useState<string>(defaultAssignmentsChecklist);
  const [selectedSummaryChecklist, setSelectedSummaryChecklist] = useState<string>('default');
  const [selectedAssignmentsChecklist, setSelectedAssignmentsChecklist] = useState<string>('default');
  const [editingChecklist, setEditingChecklist] = useState<boolean>(false);
  const [activeChecklist, setActiveChecklist] = useState<'summary' | 'assignments'>('summary');

  // CV Analysis type selection using radio group
  const cvAnalysisType = useRadioGroup({
    value: 'combined',
    onChange: (value: string) => {
      // Reset results when switching analysis types
      setResult({});
      setError(null);
    }
  });

  // CV Customization specific state
  const [customerFiles, setCustomerFiles] = useState<File[]>([]);
  const [useStreaming, setUseStreaming] = useState<boolean>(true);

  const handleCVUpload = (file: File) => {
    setError(null);
    setCvFile(file);
  };

  const handleCustomerFilesUpload = (files: File[]) => {
    setError(null);
    setCustomerFiles(files);
  };

  const handleChecklistTypeChange = (type: 'summary' | 'assignments') => {
    setActiveChecklist(type);
  };

  const handleSummaryChecklistChange = (id: string) => {
    const checklist = summaryChecklists.find(c => c.id === id);
    if (checklist) {
      setSelectedSummaryChecklist(id);
      setSummaryChecklistText(checklist.content);
    }
  };

  const handleAssignmentsChecklistChange = (id: string) => {
    const checklist = assignmentsChecklists.find(c => c.id === id);
    if (checklist) {
      setSelectedAssignmentsChecklist(id);
      setAssignmentsChecklistText(checklist.content);
    }
  };

  // CV Analysis functionality
  const handleAnalyze = async () => {
    if (!cvFile) {
      setError('Please upload a CV file first.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult({});

      const analysisType = cvAnalysisType.value as CVAnalysisType;
      
      const formData = new FormData();
      formData.append('file', cvFile);
      formData.append('summaryChecklistText', summaryChecklistText);
      formData.append('assignmentsChecklistText', assignmentsChecklistText);
      formData.append('analysisType', analysisType);
      formData.append('modelProvider', selectedModel.provider);
      formData.append('modelName', selectedModel.model);

      // Determine the correct endpoint based on the analysis type
      let endpoint = '/api/analyze-cv';
      
      // Use the specialized endpoint for enhanced agent analysis
      if (analysisType === 'enhanced_agent') {
        endpoint = '/api/cv-analysis-agent';
      }

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
            const combinedResults: any = {};
            combinedResults[analysisType] = JSON.stringify(errorWithLogs);
            setResult(combinedResults);
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
      const combinedResults: any = {};
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

      console.log('Analysis result:', combinedResults);
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

  // CV Customization functionality
  const handleCustomizeWithStreaming = async () => {
    if (!cvFile) {
      setError('Please upload a CV file first.');
      return;
    }

    if (customerFiles.length === 0) {
      setError('Please upload at least one customer requirements file.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult({});

      const formData = new FormData();
      formData.append('cvFile', cvFile);
      
      // Add all customer files
      customerFiles.forEach(file => {
        formData.append('customerFiles', file);
      });
      
      formData.append('modelProvider', selectedModel.provider);
      formData.append('modelName', selectedModel.model);

      // Use the streaming endpoint
      const response = await fetch('/api/cv-customization/stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to start CV customization: ${response.status} ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to read response stream');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Split buffer into lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Call the progress update handler if it exists
              if ((window as any).handleProgressUpdate) {
                (window as any).handleProgressUpdate(data);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during customization. Please try again.');
      }
      console.error('Customization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomizeTraditional = async () => {
    if (!cvFile) {
      setError('Please upload a CV file first.');
      return;
    }

    if (customerFiles.length === 0) {
      setError('Please upload at least one customer requirements file.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult({});

      const formData = new FormData();
      formData.append('cvFile', cvFile);
      
      // Add all customer files
      customerFiles.forEach(file => {
        formData.append('customerFiles', file);
      });
      
      formData.append('modelProvider', selectedModel.provider);
      formData.append('modelName', selectedModel.model);

      const response = await fetch('/api/cv-customization', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        
        try {
          errorData = await response.json();
          
          if (errorData.logs && Array.isArray(errorData.logs)) {
            const errorWithLogs = {
              error: errorData.error || `Failed to customize CV: ${response.status}`,
              details: errorData.details || response.statusText,
              logs: errorData.logs
            };
            
            throw new Error(errorData.error || `Failed to customize CV: ${response.status} ${response.statusText}`);
          }
        } catch (e: unknown) {
          errorData = { 
            error: `Failed to parse error response: ${response.status} ${response.statusText}` 
          };
        }
        
        throw new Error(errorData.error || `Failed to customize CV: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during customization. Please try again.');
      }
      console.error('Customization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomize = () => {
    if (useStreaming) {
      handleCustomizeWithStreaming();
    } else {
      handleCustomizeTraditional();
    }
  };

  const handleProgressComplete = (finalResult: any) => {
    setResult(finalResult);
    setIsLoading(false);
  };

  const handleProgressError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const toggleChecklistEditing = () => {
    setEditingChecklist(!editingChecklist);
  };

  // Get the current analysis mode
  const currentMode = analysisMode.value as AnalysisMode;
  const currentAnalysisType = cvAnalysisType.value as CVAnalysisType;

  // Determine if we can run the analysis/customization
  const canRunAnalysis = cvFile && !isLoading;
  const canRunCustomization = cvFile && customerFiles.length > 0 && !isLoading && selectedModel.provider === 'openai';
  const canRunEnhancedAgent = currentAnalysisType === 'enhanced_agent' && selectedModel.provider !== 'openai';

  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Heading level={1} data-size="xl">CV Enhancement Tool</Heading>
          <Paragraph data-size="md" className="max-w-3xl mx-auto">
            Improve your CV with AI-powered analysis or customize it for specific customer requirements. 
            Choose your mode below and upload your documents to get started.
          </Paragraph>
        </div>

        <div className="flex flex-col gap-8">
          {/* Mode Selection */}
          <Card>
            <Card.Block>
              <Heading level={2} data-size="sm">Select Analysis Mode</Heading>
              <div className="mt-4 space-y-3">
                <Radio
                  {...analysisMode.getRadioProps('cv_analysis')}
                  label="CV Analysis & Enhancement"
                  description="Analyze your CV against company guidelines and get improvement recommendations"
                />
                <Radio
                  {...analysisMode.getRadioProps('cv_customization')}
                  label="CV Customization for Customer Requirements"
                  description="Customize your CV to match specific customer requirements and job descriptions"
                />
              </div>
            </Card.Block>
          </Card>

          {/* Configuration Card */}
          <Card>
            <Card.Block>
              <Heading level={2} data-size="sm">
                {currentMode === 'cv_analysis' ? 'Upload CV & Configure Analysis' : 'Upload Documents & Configure'}
              </Heading>
            </Card.Block>
            <Card.Block>
              {currentMode === 'cv_analysis' ? (
                <FileUpload 
                  onCVUpload={handleCVUpload} 
                  showChecklistUpload={false}
                />
              ) : (
                <MultiFileUpload 
                  onCVUpload={handleCVUpload} 
                  onCustomerFilesUpload={handleCustomerFilesUpload}
                />
              )}
              
              <Divider data-spacing="true" className="my-4" />
              
              <div className="space-y-4">
                <ModelSelector onModelSelect={setSelectedModel} defaultProvider="openai" />
                
                {currentMode === 'cv_analysis' && (
                  <div className="space-y-2">
                    <Heading level={3} data-size="xs">Analysis Type</Heading>
                    <div className="space-y-3">
                      <Radio
                        {...cvAnalysisType.getRadioProps('combined')}
                        label="Summary & Key Assignments Analysis"
                        description="Comprehensive analysis based on company checklists"
                      />
                      <Radio
                        {...cvAnalysisType.getRadioProps('agent_evaluation')}
                        label="Basic CV Evaluation"
                        description="AI agent-based evaluation across multiple criteria"
                      />
                      <Radio
                        {...cvAnalysisType.getRadioProps('enhanced_agent')}
                        label="Advanced Agent Analysis"
                        description="Enhanced AI agent analysis with detailed insights"
                      />
                    </div>
                    
                    {(currentAnalysisType === 'agent_evaluation' || currentAnalysisType === 'enhanced_agent') && (
                      <Alert data-color="info" className="mt-2">
                        <Paragraph data-size="xs">
                          <strong>Note:</strong> Agent-based evaluations work best with OpenAI models (GPT-4 recommended). These features use specialized AI agents to provide detailed analysis across different CV aspects.
                        </Paragraph>
                      </Alert>
                    )}
                    
                    {canRunEnhancedAgent && (
                      <Alert data-color="danger" className="mt-2">
                        <Paragraph data-size="xs">
                          <strong>Warning:</strong> Enhanced Agent Analysis currently only supports OpenAI models. Please select an OpenAI model to use this feature.
                        </Paragraph>
                      </Alert>
                    )}
                  </div>
                )}

                {currentMode === 'cv_customization' && (
                  <>
                    {/* Streaming Toggle */}
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={useStreaming}
                        onChange={(e) => setUseStreaming(e.target.checked)}
                        id="streaming-toggle"
                        aria-labelledby="streaming-label"
                      />
                      <Label htmlFor="streaming-toggle" id="streaming-label">
                        Enable real-time progress updates (recommended)
                      </Label>
                    </div>
                    
                    <Alert data-color="info" className="mt-2">
                      <Paragraph data-size="xs">
                        <strong>Note:</strong> CV customization works best with OpenAI models (GPT-4o recommended). This feature uses specialized AI agents to analyze your CV and customer requirements to provide tailored recommendations.
                        {useStreaming && <span className="block mt-1"><strong>Real-time updates:</strong> You'll see progress as each step completes, making the process more transparent and engaging.</span>}
                      </Paragraph>
                    </Alert>
                    
                    {selectedModel.provider !== 'openai' && (
                      <Alert data-color="danger" className="mt-2">
                        <Paragraph data-size="xs">
                          <strong>Warning:</strong> CV customization currently only supports OpenAI models. Please select an OpenAI model to use this feature.
                        </Paragraph>
                      </Alert>
                    )}
                  </>
                )}

                <Button
                  variant="primary"
                  onClick={currentMode === 'cv_analysis' ? handleAnalyze : handleCustomize}
                  disabled={
                    currentMode === 'cv_analysis' 
                      ? !canRunAnalysis || canRunEnhancedAgent
                      : !canRunCustomization
                  }
                  className="w-full"
                >
                  {isLoading 
                    ? (currentMode === 'cv_analysis' ? 'Analyzing...' : 'Processing...') 
                    : (currentMode === 'cv_analysis' ? 'Analyze' : 'Customize CV')
                  }
                </Button>

                {error && (
                  <Alert data-color="danger">
                    {error}
                  </Alert>
                )}
              </div>
            </Card.Block>
          </Card>

          {/* Progress Component - only show when using streaming and loading for customization */}
          {currentMode === 'cv_customization' && useStreaming && isLoading && (
            <CVCustomizationProgress 
              isVisible={isLoading}
              onComplete={handleProgressComplete}
              onError={handleProgressError}
            />
          )}

          {/* Results Card */}
          <Card>
            <Card.Block className="flex justify-between items-center">
              <Heading level={2} data-size="sm">
                {currentMode === 'cv_analysis' ? 'CV Analysis Results' : 'Customization Results'}
              </Heading>
              {currentMode === 'cv_analysis' && currentAnalysisType === 'combined' && (
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
            
            {currentMode === 'cv_analysis' && editingChecklist && currentAnalysisType === 'combined' && (
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
                
                {activeChecklist === 'summary' && (
                  <div className="mb-4">
                    <Label htmlFor="summaryChecklistSelect">Select Summary Checklist Template:</Label>
                    <Select 
                      id="summaryChecklistSelect"
                      className="w-full mb-2"
                      value={selectedSummaryChecklist}
                      onChange={(e) => handleSummaryChecklistChange(e.target.value)}
                    >
                      {summaryChecklists.map(checklist => (
                        <option key={checklist.id} value={checklist.id}>
                          {checklist.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                
                {activeChecklist === 'assignments' && (
                  <div className="mb-4">
                    <Label htmlFor="assignmentsChecklistSelect">Select Assignments Checklist Template:</Label>
                    <Select 
                      id="assignmentsChecklistSelect"
                      className="w-full mb-2"
                      value={selectedAssignmentsChecklist}
                      onChange={(e) => handleAssignmentsChecklistChange(e.target.value)}
                    >
                      {assignmentsChecklists.map(checklist => (
                        <option key={checklist.id} value={checklist.id}>
                          {checklist.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                
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
              {currentMode === 'cv_analysis' ? (
                <AnalysisResults 
                  result={result} 
                  isLoading={isLoading} 
                  analysisTypes={[currentAnalysisType as AnalysisType]}
                />
              ) : (
                <CustomizationResults 
                  result={result} 
                  isLoading={isLoading && !useStreaming} // Only show loading for traditional mode
                />
              )}
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
