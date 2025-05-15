'use server';

import { revalidatePath } from 'next/cache';

type AnalysisType = 'summary' | 'assignments' | 'agent_evaluation';

type AnalyzeParams = {
  file: File;
  checklistText: string;
  analysisType: AnalysisType;
  modelProvider: string;
  modelName: string;
};

type AnalysisResult = {
  success: boolean;
  data: {
    result: string;
    isStructured?: boolean;
  };
  error?: string;
};

export async function analyzeCVAction(params: AnalyzeParams): Promise<AnalysisResult> {
  try {
    const { file, checklistText, analysisType, modelProvider, modelName } = params;
    
    // Create FormData to send to API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('checklistText', checklistText);
    formData.append('analysisType', analysisType);
    formData.append('modelProvider', modelProvider);
    formData.append('modelName', modelName);

    // Choose the appropriate endpoint based on analysis type
    const endpoint = analysisType === 'agent_evaluation' 
      ? '/api/agent-cv-evaluation' 
      : '/api/analyze-cv';

    // In a server action, we need to use absolute URLs
    // Use BASE_URL environment variable for production (Azure) deployments
    // Fall back to localhost for development
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const url = new URL(endpoint, baseUrl);
    
    console.log(`Making API request to: ${url.toString()}`);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to analyze CV: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Refresh the page data
    revalidatePath('/');
    
    // Different endpoints return different structures
    if (analysisType === 'agent_evaluation') {
      // Check if the result is structured or not (Anthropic vs OpenAI)
      if (data.isStructured === false) {
        // For Anthropic, we get plain text
        return {
          success: true,
          data: {
            result: data.result,
            isStructured: false
          }
        };
      } else {
        // For OpenAI, we get structured data
        return {
          success: true,
          data: {
            result: data.result,
            isStructured: true
          }
        };
      }
    } else {
      return {
        success: true,
        data: {
          result: data.result
        }
      };
    }
  } catch (error) {
    console.error('Analysis error:', error);
    return {
      success: false,
      data: { result: '' },
      error: error instanceof Error ? error.message : 'An error occurred during analysis'
    };
  }
} 