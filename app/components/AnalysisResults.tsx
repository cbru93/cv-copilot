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

// Define the enhanced agent evaluation structure
interface EnhancedAgentEvaluation {
  overall_score: number;
  summary: string;
  key_strengths: string[];
  key_improvement_areas: string[];
  criterion_evaluations: Array<{
    criterion_id: string;
    criterion_name: string;
    score: number;
    reasoning: string;
    suggestions: string[];
    improved_version?: string;
  }>;
  detailed_analysis: {
    language_quality: {
      score: number;
      reasoning: string;
      suggestions: string[];
      improved_version?: string;
      criterion_id: string;
      criterion_name: string;
    };
    content_completeness: {
      score: number;
      reasoning: string;
      suggestions: string[];
      element_verification: Array<{
        element: string;
        present: boolean;
        comment?: string;
      }>;
      criterion_id: string;
      criterion_name: string;
    };
    summary_quality: {
      score: number;
      reasoning: string;
      suggestions: string[];
      improved_version: string;
      criterion_id: string;
      criterion_name: string;
    };
    project_descriptions: {
      score: number;
      reasoning: string;
      suggestions: string[];
      project_evaluations: Array<{
        project_name: string;
        score: number;
        strengths: string[];
        weaknesses: string[];
        improved_version?: string;
      }>;
      criterion_id: string;
      criterion_name: string;
    };
    competence_verification: {
      score: number;
      reasoning: string;
      suggestions: string[];
      unverified_competencies?: string[];
      unverified_roles?: string[];
      criterion_id: string;
      criterion_name: string;
    };
  };
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

export type AnalysisType = 'combined' | 'agent_evaluation' | 'enhanced_agent';
type TabValue = 'summary' | 'assignments' | 'agent_evaluation' | 'enhanced_agent';

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

  const isEnhancedAgentEvaluation = (analysisResult: any): boolean => {
    try {
      if (!analysisResult || typeof analysisResult === 'string') return false;
      return 'overall_score' in analysisResult && 
             'criterion_evaluations' in analysisResult && 
             'detailed_analysis' in analysisResult;
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
    if (typeof result !== 'object' || result === null || 
        !('combined' in result || 'agent_evaluation' in result || 'enhanced_agent' in result)) {
      return result;
    }

    // New format with multiple analysis types
    if (activeTab === 'summary' || activeTab === 'assignments') {
      return result['combined'];
    } else if (activeTab === 'agent_evaluation') {
      return result['agent_evaluation'];
    } else if (activeTab === 'enhanced_agent') {
      return result['enhanced_agent'];
    }
    
    return null;
  };

  // Add a helper function to check if agent evaluation data is available
  const hasAgentEvaluationData = (): boolean => {
    if (typeof result !== 'object' || result === null) return false;
    return 'agent_evaluation' in result && result['agent_evaluation'] !== null;
  };

  // Add a helper function to check if enhanced agent evaluation data is available
  const hasEnhancedAgentData = (): boolean => {
    if (typeof result !== 'object' || result === null) return false;
    return 'enhanced_agent' in result && result['enhanced_agent'] !== null;
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

  const shouldShowEnhancedAgentTab = (): boolean => {
    return effectiveAnalysisTypes.includes('enhanced_agent');
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
      const shouldShowTabs = shouldShowSummaryTab() || shouldShowAssignmentsTab() || shouldShowAgentEvaluationTab() || shouldShowEnhancedAgentTab();
      if (!shouldShowTabs) {
        return <div className="p-4 text-center text-gray-500">No analysis results available</div>;
      }

      // For combined analysis tabs, we need valid combined results
      const hasCombinedData = combinedResult && typeof combinedResult === 'object' && 
                             'summary_analysis' in combinedResult && 
                             'assignments_analysis' in combinedResult;
      
      // Default to agent evaluation tab if there's no combined data but there is agent data
      let defaultTab: TabValue = 'summary';
      if (!hasCombinedData) {
        if (hasEnhancedAgentData()) {
          defaultTab = 'enhanced_agent';
        } else if (hasAgentEvaluationData()) {
        defaultTab = 'agent_evaluation';
        }
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
              {shouldShowEnhancedAgentTab() && (
                <TabsTab value="enhanced_agent">Enhanced Analysis</TabsTab>
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
            
            {shouldShowEnhancedAgentTab() && hasEnhancedAgentData() && (
              <TabsPanel value="enhanced_agent">
                {renderEnhancedAgentEvaluation(result['enhanced_agent'])}
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

  // Render enhanced agent evaluation with specialized agents
  const renderEnhancedAgentEvaluation = (agentResult: any) => {
    console.log('Rendering enhanced agent evaluation with data:', typeof agentResult);
    
    try {
      if (!agentResult || typeof agentResult === 'string') {
        console.log('Enhanced agent result is string or null:', agentResult);
        if (typeof agentResult === 'string') {
          return renderFormattedTextResult(agentResult);
        }
        return null;
      }
      
      // Validate the structure to avoid rendering errors
      if (!agentResult.overall_score || !agentResult.summary ||
          !Array.isArray(agentResult.key_strengths) || 
          !Array.isArray(agentResult.key_improvement_areas) ||
          !Array.isArray(agentResult.criterion_evaluations)) {
        console.log('Invalid enhanced agent evaluation structure. Available keys:', Object.keys(agentResult));
        
        // If we have a result property, it might be wrapped one level deep
        if (agentResult.result && typeof agentResult.result === 'object') {
          console.log('Found result property, trying to use that instead');
          return renderEnhancedAgentEvaluation(agentResult.result);
        }
        
        throw new Error('Invalid enhanced agent evaluation result structure');
      }
      
      // Check if we're using the Azure-optimized format (without detailed_analysis)
      const isAzureFormat = !agentResult.detailed_analysis && agentResult.criterion_evaluations;
      console.log(`Using ${isAzureFormat ? 'Azure-optimized' : 'standard'} result format`);
      
      // Create a compatible detailed_analysis object if using Azure format
      let detailed_analysis = agentResult.detailed_analysis;
      if (isAzureFormat) {
        detailed_analysis = agentResult.criterion_evaluations.reduce((acc: any, criterion: any) => {
          acc[criterion.criterion_id] = criterion;
          return acc;
        }, {});
      }

    return (
      <div className="space-y-6">
          {/* Overall Rating and Summary */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <Heading level={3} data-size='sm'>Overall Evaluation</Heading>
              <div className="px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-800">
                Score: {(agentResult.overall_score).toFixed(1)}/10
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
          
          {/* Specialized Analysis Sections */}
          <Heading level={3} data-size='sm' className="mt-6 mb-3">Specialized Analysis</Heading>
          
          {/* Language Quality */}
          {(isAzureFormat || detailed_analysis.language_quality) && (
            <Card>
              <div className="flex justify-between items-center mb-2">
                <Heading level={4} data-size='xs'>
                  {isAzureFormat 
                    ? detailed_analysis.language_quality.criterion_name 
                    : detailed_analysis.language_quality.criterion_name}
                </Heading>
                <Tag data-color={
                  (isAzureFormat 
                    ? detailed_analysis.language_quality.score 
                    : detailed_analysis.language_quality.score) >= 8 ? 'success' : 
                  (isAzureFormat 
                    ? detailed_analysis.language_quality.score 
                    : detailed_analysis.language_quality.score) >= 5 ? 'warning' : 
                  'danger'
                }>
                  Score: {(isAzureFormat 
                    ? detailed_analysis.language_quality.score 
                    : detailed_analysis.language_quality.score).toFixed(1)}/10
                </Tag>
              </div>
              
              <Paragraph className="mb-3">
                {isAzureFormat 
                  ? detailed_analysis.language_quality.reasoning 
                  : detailed_analysis.language_quality.reasoning}
              </Paragraph>
              
              {(isAzureFormat 
                ? detailed_analysis.language_quality.suggestions 
                : detailed_analysis.language_quality.suggestions).length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <Heading level={5} data-size='xs' className="mb-1 text-blue-800">Suggestions</Heading>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {(isAzureFormat 
                      ? detailed_analysis.language_quality.suggestions 
                      : detailed_analysis.language_quality.suggestions).map((suggestion: string, idx: number) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
          
          {/* Content Completeness */}
          {(isAzureFormat || detailed_analysis.content_completeness) && (
            <Card>
              <div className="flex justify-between items-center mb-2">
                <Heading level={4} data-size='xs'>
                  {isAzureFormat 
                    ? detailed_analysis.content_completeness.criterion_name 
                    : detailed_analysis.content_completeness.criterion_name}
                </Heading>
                <Tag data-color={
                  (isAzureFormat 
                    ? detailed_analysis.content_completeness.score 
                    : detailed_analysis.content_completeness.score) >= 8 ? 'success' : 
                  (isAzureFormat 
                    ? detailed_analysis.content_completeness.score 
                    : detailed_analysis.content_completeness.score) >= 5 ? 'warning' : 
                  'danger'
                }>
                  Score: {(isAzureFormat 
                    ? detailed_analysis.content_completeness.score 
                    : detailed_analysis.content_completeness.score).toFixed(1)}/10
                </Tag>
              </div>
              
              <Paragraph className="mb-3">
                {isAzureFormat 
                  ? detailed_analysis.content_completeness.reasoning 
                  : detailed_analysis.content_completeness.reasoning}
              </Paragraph>
              
              {(isAzureFormat 
                ? detailed_analysis.content_completeness.suggestions 
                : detailed_analysis.content_completeness.suggestions).length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <Heading level={5} data-size='xs' className="mb-1 text-blue-800">Suggestions</Heading>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {(isAzureFormat 
                      ? detailed_analysis.content_completeness.suggestions 
                      : detailed_analysis.content_completeness.suggestions).map((suggestion: string, idx: number) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {!isAzureFormat && detailed_analysis.content_completeness.element_verification && (
                <div className="mt-3">
                  <Heading level={5} data-size='xs' className="mb-2">Element Verification</Heading>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 border-b text-left">Element</th>
                          <th className="px-4 py-2 border-b text-left">Present</th>
                          <th className="px-4 py-2 border-b text-left">Comment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailed_analysis.content_completeness.element_verification.map((element: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-2 border-b">{element.element}</td>
                            <td className="px-4 py-2 border-b">
                              <span className={element.present ? 'text-green-600' : 'text-red-600'}>
                                {element.present ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="px-4 py-2 border-b">{element.comment || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )}
          
          {/* Summary Quality */}
          {(isAzureFormat || detailed_analysis.summary_quality) && (
            <Card>
              <div className="flex justify-between items-center mb-2">
                <Heading level={4} data-size='xs'>
                  {isAzureFormat 
                    ? detailed_analysis.summary_quality.criterion_name 
                    : detailed_analysis.summary_quality.criterion_name}
                </Heading>
                <Tag data-color={
                  (isAzureFormat 
                    ? detailed_analysis.summary_quality.score 
                    : detailed_analysis.summary_quality.score) >= 8 ? 'success' : 
                  (isAzureFormat 
                    ? detailed_analysis.summary_quality.score 
                    : detailed_analysis.summary_quality.score) >= 5 ? 'warning' : 
                  'danger'
                }>
                  Score: {(isAzureFormat 
                    ? detailed_analysis.summary_quality.score 
                    : detailed_analysis.summary_quality.score).toFixed(1)}/10
                </Tag>
              </div>
              
              <Paragraph className="mb-3">
                {isAzureFormat 
                  ? detailed_analysis.summary_quality.reasoning 
                  : detailed_analysis.summary_quality.reasoning}
              </Paragraph>
              
              {(isAzureFormat 
                ? detailed_analysis.summary_quality.suggestions 
                : detailed_analysis.summary_quality.suggestions).length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <Heading level={5} data-size='xs' className="mb-1 text-blue-800">Suggestions</Heading>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {(isAzureFormat 
                      ? detailed_analysis.summary_quality.suggestions 
                      : detailed_analysis.summary_quality.suggestions).map((suggestion: string, idx: number) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
          
          {/* Project Descriptions */}
          {(isAzureFormat || detailed_analysis.project_descriptions) && (
            <Card>
              <div className="flex justify-between items-center mb-2">
                <Heading level={4} data-size='xs'>
                  {isAzureFormat 
                    ? detailed_analysis.project_descriptions.criterion_name 
                    : detailed_analysis.project_descriptions.criterion_name}
                </Heading>
                <Tag data-color={
                  (isAzureFormat 
                    ? detailed_analysis.project_descriptions.score 
                    : detailed_analysis.project_descriptions.score) >= 8 ? 'success' : 
                  (isAzureFormat 
                    ? detailed_analysis.project_descriptions.score 
                    : detailed_analysis.project_descriptions.score) >= 5 ? 'warning' : 
                  'danger'
                }>
                  Score: {(isAzureFormat 
                    ? detailed_analysis.project_descriptions.score 
                    : detailed_analysis.project_descriptions.score).toFixed(1)}/10
                </Tag>
              </div>
              
              <Paragraph className="mb-3">
                {isAzureFormat 
                  ? detailed_analysis.project_descriptions.reasoning 
                  : detailed_analysis.project_descriptions.reasoning}
              </Paragraph>
              
              {(isAzureFormat 
                ? detailed_analysis.project_descriptions.suggestions 
                : detailed_analysis.project_descriptions.suggestions).length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <Heading level={5} data-size='xs' className="mb-1 text-blue-800">General Suggestions</Heading>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {(isAzureFormat 
                      ? detailed_analysis.project_descriptions.suggestions 
                      : detailed_analysis.project_descriptions.suggestions).map((suggestion: string, idx: number) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Project Evaluations - only shown in standard mode */}
              {!isAzureFormat && detailed_analysis.project_descriptions.project_evaluations && (
                <>
                  <Heading level={5} data-size='xs' className="mt-4 mb-2">Individual Project Evaluations</Heading>
                  
                  {detailed_analysis.project_descriptions.project_evaluations.map((project: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{project.project_name}</span>
                        <Tag data-color={
                          project.score >= 8 ? 'success' : 
                          project.score >= 5 ? 'warning' : 
                          'danger'
                        }>
                          Score: {(project.score).toFixed(1)}/10
                        </Tag>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <div>
                          <span className="text-xs font-bold text-green-700">Strengths:</span>
                          <ul className="list-disc pl-5 text-xs">
                            {project.strengths.map((strength: string, i: number) => (
                              <li key={i}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <span className="text-xs font-bold text-red-700">Weaknesses:</span>
                          <ul className="list-disc pl-5 text-xs">
                            {project.weaknesses.map((weakness: string, i: number) => (
                              <li key={i}>{weakness}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      {project.improved_version && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <div className="font-bold mb-1">Improved Version:</div>
                          <div className="whitespace-pre-wrap">{project.improved_version}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </Card>
          )}
          
          {/* Competence Verification - only shown in standard mode */}
          {!isAzureFormat && detailed_analysis.competence_verification && (
            <Card>
              <div className="flex justify-between items-center mb-2">
                <Heading level={4} data-size='xs'>{detailed_analysis.competence_verification.criterion_name}</Heading>
                <Tag data-color={
                  detailed_analysis.competence_verification.score >= 8 ? 'success' : 
                  detailed_analysis.competence_verification.score >= 5 ? 'warning' : 
                  'danger'
                }>
                  Score: {(detailed_analysis.competence_verification.score).toFixed(1)}/10
                </Tag>
              </div>
              
              <Paragraph className="mb-3">{detailed_analysis.competence_verification.reasoning}</Paragraph>
              
              {detailed_analysis.competence_verification.suggestions.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <Heading level={5} data-size='xs' className="mb-1 text-blue-800">Suggestions</Heading>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {detailed_analysis.competence_verification.suggestions.map((suggestion: string, idx: number) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {detailed_analysis.competence_verification.unverified_competencies && 
                 detailed_analysis.competence_verification.unverified_competencies.length > 0 && (
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <Heading level={5} data-size='xs' className="mb-1 text-amber-800">Unverified Competencies</Heading>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {detailed_analysis.competence_verification.unverified_competencies.map((comp: string, idx: number) => (
                        <li key={idx}>{comp}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {detailed_analysis.competence_verification.unverified_roles && 
                 detailed_analysis.competence_verification.unverified_roles.length > 0 && (
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <Heading level={5} data-size='xs' className="mb-1 text-amber-800">Unverified Roles</Heading>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {detailed_analysis.competence_verification.unverified_roles.map((role: string, idx: number) => (
                        <li key={idx}>{role}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}
      </div>
    );
    } catch (err) {
      console.error('Error rendering enhanced agent evaluation:', err);
      return renderFormattedTextResult(JSON.stringify(agentResult, null, 2));
    }
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
                     ('combined' in result || 'agent_evaluation' in result || 'enhanced_agent' in result);

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
    } else if (isEnhancedAgentEvaluation(currentResult)) {
      return renderEnhancedAgentEvaluation(currentResult);
    } else {
      // Fallback to text rendering
      return renderFormattedTextResult(currentResult);
    }
  }
} 