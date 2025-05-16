'use client';

import { useState } from 'react';
import { 
  Tabs, 
  TabsList, 
  TabsTab, 
  TabsPanel, 
  Button, 
  Card, 
  Alert, 
  Heading,
  Paragraph,
  Badge,
  Skeleton,
  Tag
} from '@digdir/designsystemet-react';

// Define the structure of agent evaluation results
interface CriterionRating {
  criterion_id: string;
  criterion_name: string;
  rating: number;
  reasoning: string;
  suggestions: string[];
}

interface AgentEvaluationResult {
  overall_rating: number;
  summary: string;
  key_strengths: string[];
  key_improvement_areas: string[];
  criterion_ratings: CriterionRating[];
}

// Define the structure for summary analysis
interface SummaryAnalysis {
  original_summary: string;
  analysis: string;
  improved_summary: string;
}

// Define the structure for a single assignment
interface Assignment {
  title: string;
  original_text: string;
  issues: string;
  improved_version: string;
}

// Define the structure for assignments analysis
interface AssignmentsAnalysis {
  overall_issues: string;
  assignments: Assignment[];
}

// Combined analysis result
interface CombinedAnalysisResult {
  summary_analysis: SummaryAnalysis;
  assignments_analysis: AssignmentsAnalysis;
}

export type AnalysisType = 'combined' | 'agent_evaluation';
type TabValue = 'summary' | 'assignments' | 'agent_evaluation';

interface AnalysisResultsProps {
  result: any;
  isLoading: boolean;
  analysisTypes?: AnalysisType[];
  analysisType?: AnalysisType; // Keep for backward compatibility
}

export default function AnalysisResults({ 
  result, 
  isLoading, 
  analysisTypes = ['combined'], 
  analysisType 
}: AnalysisResultsProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('summary');

  // For backward compatibility
  const effectiveAnalysisTypes = analysisTypes.length > 0 ? analysisTypes : [analysisType || 'combined'];

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  // Helper function to check if the result contains an error message
  const isErrorResult = (analysisResult: any): boolean => {
    try {
      if (typeof analysisResult === 'string' && (
          analysisResult.includes('Error:') || 
          analysisResult.includes('error:') || 
          analysisResult.includes('failed') ||
          analysisResult.includes('Failed'))) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Helper functions to check result types
  const isAgentEvaluation = (analysisResult: any): boolean => {
    try {
      if (!analysisResult || typeof analysisResult === 'string') return false;
      return 'overall_rating' in analysisResult && 'criterion_ratings' in analysisResult;
    } catch {
      return false;
    }
  };

  const isCombinedAnalysis = (analysisResult: any): boolean => {
    try {
      if (!analysisResult || typeof analysisResult === 'string') return false;
      return 'summary_analysis' in analysisResult && 'assignments_analysis' in analysisResult;
    } catch {
      return false;
    }
  };

  // Get the appropriate result based on the tab and analysis types
  const getResultForCurrentTab = (): any => {
    // Handle legacy format (string or single object)
    if (typeof result !== 'object' || result === null || !('combined' in result || 'agent_evaluation' in result)) {
      return result;
    }

    // New format with multiple analysis types
    if (activeTab === 'summary' || activeTab === 'assignments') {
      return result['combined'];
    } else if (activeTab === 'agent_evaluation') {
      return result['agent_evaluation'];
    }
    
    return null;
  };

  // Add a helper function to check if agent evaluation data is available
  const hasAgentEvaluationData = (): boolean => {
    if (typeof result !== 'object' || result === null) return false;
    
    const hasAgentData = 'agent_evaluation' in result && result['agent_evaluation'] !== null;
    console.log('Checking for agent evaluation data:', hasAgentData);
    
    if (hasAgentData) {
      console.log('Agent evaluation data type:', typeof result['agent_evaluation']);
      console.log('Agent evaluation data keys:', 
        typeof result['agent_evaluation'] === 'object' && result['agent_evaluation'] !== null
          ? Object.keys(result['agent_evaluation'])
          : 'N/A');
    }
    
    return hasAgentData;
  };

  // Determine which tabs should be shown
  const shouldShowSummaryTab = (): boolean => {
    return effectiveAnalysisTypes.includes('combined');
  };

  const shouldShowAssignmentsTab = (): boolean => {
    return effectiveAnalysisTypes.includes('combined');
  };

  const shouldShowAgentEvaluationTab = (): boolean => {
    return effectiveAnalysisTypes.includes('agent_evaluation');
  };

  // Render error message
  const renderErrorMessage = (errorResult: any) => {
    // Check if debug logs are available in the result
    const debugLogs: string[] = typeof errorResult === 'string' && errorResult.includes('"logs":') 
      ? JSON.parse(errorResult).logs || []
      : [];
    
    const hasDebugInfo = debugLogs.length > 0;
    
    return (
      <Alert>
        <Heading level={3} data-size='sm' className="mb-2">Analysis Error</Heading>
        <Paragraph className="mb-3">There was a problem processing the CV analysis.</Paragraph>
        <div className="p-3 bg-white rounded border border-red-100 text-red-800 text-sm font-mono overflow-auto">
          {typeof errorResult === 'string' ? errorResult : 'Unknown error occurred'}
        </div>
        
        {hasDebugInfo && (
          <div className="mt-4 p-3 bg-gray-800 text-green-400 rounded border border-gray-700 font-mono text-xs overflow-auto max-h-64">
            <Heading level={4} data-size='xs' className="mb-2">Debug Logs:</Heading>
            <pre>
              {debugLogs.map((log: string, index: number) => (
                <div key={index}>{log}</div>
              ))}
            </pre>
          </div>
        )}
      </Alert>
    );
  };

  // Render the combined analysis with tabs
  const renderCombinedAnalysis = (combinedResult: any) => {
    try {
      // Check if we need to show any tabs at all
      const shouldShowTabs = shouldShowSummaryTab() || shouldShowAssignmentsTab() || shouldShowAgentEvaluationTab();
      if (!shouldShowTabs) {
        return <div className="p-4 text-center text-gray-500">No analysis results available</div>;
      }

      // For combined analysis tabs, we need valid combined results
      const hasCombinedData = combinedResult && typeof combinedResult === 'object' && 
                             'summary_analysis' in combinedResult && 
                             'assignments_analysis' in combinedResult;
      
      // Default to agent evaluation tab if there's no combined data but there is agent data
      let defaultTab: TabValue = 'summary';
      if (!hasCombinedData && hasAgentEvaluationData()) {
        defaultTab = 'agent_evaluation';
      }

      // Get data safely for each tab
      const summaryResult = hasCombinedData ? combinedResult.summary_analysis : null;
      const assignmentsResult = hasCombinedData ? combinedResult.assignments_analysis : null;
      
      return (
        <div className="space-y-6">
          <Tabs defaultValue={defaultTab} onChange={(value) => setActiveTab(value as TabValue)}>
            <TabsList>
              {shouldShowSummaryTab() && (
                <TabsTab value="summary">Summary Analysis</TabsTab>
              )}
              {shouldShowAssignmentsTab() && (
                <TabsTab value="assignments">Key Assignments Analysis</TabsTab>
              )}
              {shouldShowAgentEvaluationTab() && (
                <TabsTab value="agent_evaluation">Agent Evaluation</TabsTab>
              )}
            </TabsList>
            
            {shouldShowSummaryTab() && hasCombinedData && (
              <TabsPanel value="summary">
                <div className="space-y-6">
                  <Card>
                    <Heading level={3} data-size='sm' className="mb-3">Original Summary</Heading>
                    <div className="whitespace-pre-wrap text-sm p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                      {summaryResult.original_summary}
                    </div>
                    
                    <Button 
                      variant="secondary"
                      onClick={() => copyToClipboard(summaryResult.original_summary, 'original')}
                    >
                      {copiedSection === 'original' ? "Copied!" : "Copy Original"}
                    </Button>
                  </Card>
                  
                  <Card>
                    <Heading level={3} data-size='sm' className="mb-3">Analysis</Heading>
                    <div className="whitespace-pre-wrap text-sm">
                      {summaryResult.analysis}
                    </div>
                  </Card>
                  
                  <Card>
                    <Heading level={3} data-size='sm' className="mb-3">Improved Summary</Heading>
                    <div className="whitespace-pre-wrap text-sm p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      {summaryResult.improved_summary}
                    </div>
                    
                    <Button
                      data-size='sm'
                      onClick={() => copyToClipboard(summaryResult.improved_summary, 'improved')}
                    >
                      {copiedSection === 'improved' ? "Copied!" : "Copy Improved Version"}
                    </Button>
                  </Card>
                </div>
              </TabsPanel>
            )}
            
            {shouldShowAssignmentsTab() && hasCombinedData && (
              <TabsPanel value="assignments">
                <div className="space-y-6">
                  <Card>
                    <Heading level={3} className="mb-3">Overall Issues</Heading>
                    <div className="whitespace-pre-wrap text-sm">
                      {assignmentsResult.overall_issues}
                    </div>
                  </Card>
                  
                  <Heading level={3} data-size='sm' className="mt-6 mb-3">Assignment Analysis</Heading>
                  
                  {assignmentsResult.assignments.map((assignment: Assignment, index: number) => (
                    <Card key={index}>
                      <Heading level={4} data-size='xs' className="mb-3">{assignment.title}</Heading>
                      
                      <div className="mb-4">
                        <Heading level={5} data-size='xs' className="mb-2">Original Text:</Heading>
                        <div className="whitespace-pre-wrap text-sm p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          {assignment.original_text}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <Heading level={5} data-size='xs' className="mb-2">Issues Found:</Heading>
                        <div className="whitespace-pre-wrap text-sm">
                          {assignment.issues}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <Heading level={5} data-size='xs' className="mb-2">Improved Version:</Heading>
                        <div className="whitespace-pre-wrap text-sm p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          {assignment.improved_version}
                        </div>
                      </div>
                      
                      <Button
                        data-size='sm'
                        onClick={() => copyToClipboard(assignment.improved_version, `assignment-${index}`)}
                      >
                        {copiedSection === `assignment-${index}` ? "Copied!" : "Copy Improved Version"}
                      </Button>
                    </Card>
                  ))}
                </div>
              </TabsPanel>
            )}
            
            {shouldShowAgentEvaluationTab() && hasAgentEvaluationData() && (
              <TabsPanel value="agent_evaluation">
                {renderAgentEvaluation(result['agent_evaluation'])}
              </TabsPanel>
            )}
          </Tabs>
        </div>
      );
    } catch (err) {
      console.error('Error rendering combined analysis:', err);
      return renderFormattedTextResult(combinedResult);
    }
  };

  // Render the agent-based evaluation results
  const renderAgentEvaluation = (agentResult: any) => {
    console.log('Rendering agent evaluation with data:', typeof agentResult);
    
    try {
      if (!agentResult || typeof agentResult === 'string') {
        console.log('Agent result is string or null:', agentResult);
        if (typeof agentResult === 'string') {
          return renderFormattedTextResult(agentResult);
        }
        return null;
      }
      
      // Validate the structure to avoid rendering errors
      if (!agentResult.overall_rating || !agentResult.summary ||
          !Array.isArray(agentResult.key_strengths) || 
          !Array.isArray(agentResult.key_improvement_areas) ||
          !Array.isArray(agentResult.criterion_ratings)) {
        console.log('Invalid agent evaluation structure. Available keys:', Object.keys(agentResult));
        
        // If we have a result property, it might be wrapped one level deep
        if (agentResult.result && typeof agentResult.result === 'object') {
          console.log('Found result property, trying to use that instead');
          return renderAgentEvaluation(agentResult.result);
        }
        
        if (agentResult.result && typeof agentResult.result === 'string') {
          console.log('Found string result, rendering as text');
          return renderFormattedTextResult(agentResult.result);
        }
        
        throw new Error('Invalid agent evaluation result structure');
      }
      
      return (
        <div className="space-y-6">
          {/* Overall Rating and Summary */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <Heading level={3} data-size='sm'>Overall Evaluation</Heading>
              <div className="px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-800">
                Rating: {agentResult.overall_rating}/10
              </div>
            </div>
            
            <Paragraph className="mb-4">{agentResult.summary}</Paragraph>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <Heading level={4} data-size='xs' className="mb-2 text-green-800">Key Strengths</Heading>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {agentResult.key_strengths.map((strength: string, idx: number) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-amber-50 p-3 rounded-lg">
                <Heading level={4} data-size='xs' className="mb-2 text-amber-800">Areas for Improvement</Heading>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {agentResult.key_improvement_areas.map((area: string, idx: number) => (
                    <li key={idx}>{area}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
          
          {/* Detailed Criterion Ratings */}
          <Heading level={3} data-size='sm' className="mt-6 mb-3">Detailed Criteria Evaluation</Heading>
          
          {agentResult.criterion_ratings.map((criterion: CriterionRating, index: number) => (
            <Card key={index}>
              <div className="flex justify-between items-center mb-2">
                <Heading level={4} data-size='xs'>{criterion.criterion_name}</Heading>
                <Tag data-color={
                  criterion.rating >= 8 ? 'success' : 
                  criterion.rating >= 5 ? 'warning' : 
                  'danger'
                }>
                  Rating: {criterion.rating}/10
                </Tag>
              </div>
              
              <Paragraph className="mb-3">{criterion.reasoning}</Paragraph>
              
              {criterion.suggestions.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Heading level={5} data-size='xs' className="mb-1 text-blue-800">Suggestions</Heading>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {criterion.suggestions.map((suggestion: string, idx: number) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      );
    } catch (err) {
      console.error('Error rendering agent evaluation:', err);
      return renderFormattedTextResult(agentResult);
    }
  };

  // Helper function to identify and format improved sections for text results (fallback)
  const renderFormattedTextResult = (textResult: any) => {
    if (!textResult || typeof textResult !== 'string') return null;

    // Split the result into sections
    const sections = textResult.split(/(?=## )/);

    return (
      <div className="space-y-6">
        {sections.map((section, index) => {
          // Skip empty sections
          if (!section.trim()) return null;

          // Extract the section title
          const titleMatch = section.match(/^## (.+)/);
          const title = titleMatch ? titleMatch[1] : `Section ${index + 1}`;
          
          // Extract improved version if it exists
          const improvedVersionMatch = section.match(/### Improved Version:([\s\S]+?)(?=###|$)/);
          const improvedVersion = improvedVersionMatch 
            ? improvedVersionMatch[1].trim() 
            : null;

          return (
            <Card key={index}>
              <Heading level={3} className="mb-2">{title}</Heading>
              <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: section }} />
              
              {improvedVersion && (
                <div className="mt-4">
                  <Button
                    onClick={() => copyToClipboard(improvedVersion, title)}
                  >
                    {copiedSection === title ? "Copied!" : "Copy Improved Version"}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          <Skeleton variant="rectangle" height={24} width="75%" />
          <Skeleton variant="rectangle" height={16} />
          <Skeleton variant="rectangle" height={16} />
          <Skeleton variant="rectangle" height={16} />
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Analyzing CV... This may take up to a minute.
        </div>
      </Card>
    );
  }

  if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
    return (
      <Card>
        <div className="p-4 text-center text-gray-500">
          Upload a CV and select an analysis type to get started
        </div>
      </Card>
    );
  }

  // Check if we have the new format with multiple analysis types
  const isNewFormat = typeof result === 'object' && result !== null && 
                     ('combined' in result || 'agent_evaluation' in result);

  if (isNewFormat) {
    // For the new format, render the interface with all tabs
    const currentResult = getResultForCurrentTab();
    
    // Handle error in the current tab
    if (isErrorResult(currentResult)) {
      return renderErrorMessage(currentResult);
    }
    
    // Render combined analysis with all tabs
    // Only use result.combined as the base if it exists
    return renderCombinedAnalysis(result.combined || {});
  } else {
    // Handle legacy format 
    const currentResult = result;

    // Handle error results
    if (isErrorResult(currentResult)) {
      return renderErrorMessage(currentResult);
    }

    // Choose the appropriate renderer based on the result type
    if (isCombinedAnalysis(currentResult)) {
      return renderCombinedAnalysis(currentResult);
    } else if (isAgentEvaluation(currentResult)) {
      return renderAgentEvaluation(currentResult);
    } else {
      // Fallback to text rendering
      return renderFormattedTextResult(currentResult);
    }
  }
} 