'use client';

import { useState } from 'react';

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

interface AnalysisResultsProps {
  result: string | AgentEvaluationResult;
  isLoading: boolean;
}

export default function AnalysisResults({ result, isLoading }: AnalysisResultsProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  // Helper function to check if the result contains an error message
  const isErrorResult = (): boolean => {
    try {
      if (typeof result === 'string' && (
          result.includes('Error:') || 
          result.includes('error:') || 
          result.includes('failed') ||
          result.includes('Failed'))) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Helper function to check if the result is an agent evaluation
  const isAgentEvaluation = (): boolean => {
    try {
      if (!result || typeof result === 'string') return false;
      return 'overall_rating' in result && 'criterion_ratings' in result &&
        Array.isArray(result.criterion_ratings) && 
        result.criterion_ratings.length > 0;
    } catch (err) {
      console.error('Error parsing agent evaluation result:', err);
      return false;
    }
  };

  // Render error message
  const renderErrorMessage = () => {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700">
        <h3 className="font-bold mb-2">Agent Evaluation Error</h3>
        <p className="mb-3">There was a problem processing the agent-based CV evaluation. This feature might be experiencing issues in the deployed environment.</p>
        <div className="p-3 bg-white rounded border border-red-100 text-red-800 text-sm font-mono overflow-auto">
          {typeof result === 'string' ? result : 'Unknown error occurred'}
        </div>
        <div className="mt-4 bg-amber-50 p-3 rounded border border-amber-200">
          <h4 className="font-medium text-amber-800 mb-1">Suggestions:</h4>
          <ul className="list-disc pl-5 text-sm space-y-1 text-amber-700">
            <li>Try using the "CV Summary" or "Key Assignments" analysis type instead</li>
            <li>Try with a smaller CV file (under 1MB)</li>
            <li>If this is urgent, try running the application locally</li>
          </ul>
        </div>
      </div>
    );
  };

  // Render the agent-based evaluation results
  const renderAgentEvaluation = () => {
    try {
      if (!result || typeof result === 'string') return null;
      
      const agentResult = result as AgentEvaluationResult;
      
      // Validate the structure to avoid rendering errors
      if (!agentResult.overall_rating || !agentResult.summary ||
          !Array.isArray(agentResult.key_strengths) || 
          !Array.isArray(agentResult.key_improvement_areas) ||
          !Array.isArray(agentResult.criterion_ratings)) {
        throw new Error('Invalid agent evaluation result structure');
      }
      
      return (
        <div className="space-y-6">
          {/* Overall Rating and Summary */}
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Overall Evaluation</h3>
              <div className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full">
                Rating: {agentResult.overall_rating}/10
              </div>
            </div>
            
            <div className="whitespace-pre-wrap text-sm mb-4">
              {agentResult.summary}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Key Strengths</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {agentResult.key_strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-amber-50 p-3 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-2">Areas for Improvement</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {agentResult.key_improvement_areas.map((area, idx) => (
                    <li key={idx}>{area}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Detailed Criterion Ratings */}
          <h3 className="text-lg font-semibold mt-6">Detailed Criteria Evaluation</h3>
          
          {agentResult.criterion_ratings.map((criterion, index) => (
            <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold">{criterion.criterion_name}</h4>
                <div className={`px-3 py-1 rounded-full font-bold ${
                  criterion.rating >= 8 ? 'bg-green-100 text-green-800' : 
                  criterion.rating >= 5 ? 'bg-amber-100 text-amber-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  Rating: {criterion.rating}/10
                </div>
              </div>
              
              <div className="whitespace-pre-wrap text-sm mb-3">
                {criterion.reasoning}
              </div>
              
              {criterion.suggestions.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-1">Suggestions</h5>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {criterion.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    } catch (err) {
      console.error('Error rendering agent evaluation:', err);
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700">
          <h3 className="font-bold mb-2">Error displaying evaluation results</h3>
          <p>There was a problem processing the agent evaluation results. Please try again or select a different analysis type.</p>
        </div>
      );
    }
  };

  // Helper function to identify and format improved sections for text results
  const renderFormattedTextResult = () => {
    if (!result || typeof result !== 'string') return null;

    // Split the result into sections
    const sections = result.split(/(?=## )/);

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
            <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: section }} />
              
              {improvedVersion && (
                <div className="mt-4">
                  <button
                    onClick={() => copyToClipboard(improvedVersion, title)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    {copiedSection === title ? "Copied!" : "Copy Improved Version"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-md bg-gray-50">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-gray-500">Analyzing your CV...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Analysis Results</h2>
      {result ? (
        isErrorResult() ? renderErrorMessage() :
        isAgentEvaluation() ? renderAgentEvaluation() : renderFormattedTextResult()
      ) : (
        <p className="text-gray-500">Upload your CV and click "Analyze" to see results</p>
      )}
    </div>
  );
} 