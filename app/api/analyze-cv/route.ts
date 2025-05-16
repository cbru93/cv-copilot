import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';
import { z } from 'zod';

export const maxDuration = 60; // Allow up to 60 seconds for processing

// Schema for summary analysis
const summaryAnalysisSchema = z.object({
  original_summary: z.string(),
  analysis: z.string(),
  improved_summary: z.string()
});

// Schema for key assignment analysis
const assignmentAnalysisSchema = z.object({
  overall_issues: z.string(),
  assignments: z.array(
    z.object({
      title: z.string(),
      original_text: z.string(),
      issues: z.string(),
      improved_version: z.string()
    })
  )
});

// Combined analysis schema
const combinedAnalysisSchema = z.object({
  summary_analysis: summaryAnalysisSchema,
  assignments_analysis: assignmentAnalysisSchema
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pdfFile = formData.get('file') as File;
    const summaryChecklistText = formData.get('summaryChecklistText') as string;
    const assignmentsChecklistText = formData.get('assignmentsChecklistText') as string;
    const analysisType = formData.get('analysisType') as string;
    const modelProvider = formData.get('modelProvider') as ModelProvider;
    const modelName = formData.get('modelName') as string;

    // Validate required parameters
    if (!pdfFile) {
      return NextResponse.json(
        { error: 'Missing required file' },
        { status: 400 }
      );
    }

    if (!summaryChecklistText) {
      return NextResponse.json(
        { error: 'Missing summary checklist text' },
        { status: 400 }
      );
    }

    if (!assignmentsChecklistText) {
      return NextResponse.json(
        { error: 'Missing assignments checklist text' },
        { status: 400 }
      );
    }

    // Check if the requested provider is available
    if (!isProviderAvailable(modelProvider)) {
      return NextResponse.json(
        { error: `${modelProvider} API key is not configured` },
        { status: 400 }
      );
    }

    // Read the file as ArrayBuffer
    const fileArrayBuffer = await pdfFile.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    // Set environment variables for API keys
    if (modelProvider === 'openai') {
      process.env.OPENAI_API_KEY = config.openai.apiKey;
    } else if (modelProvider === 'anthropic') {
      process.env.ANTHROPIC_API_KEY = config.anthropic.apiKey;
    } else {
      return NextResponse.json(
        { error: 'Selected model provider does not support PDF analysis' },
        { status: 400 }
      );
    }

    // Create the model
    const model = modelProvider === 'openai' 
      ? openai(modelName)
      : modelProvider === 'anthropic'
        ? openai(modelName) // This should be anthropic, but for now we'll handle it in the if statement below
        : null;

    if (!model) {
      return NextResponse.json(
        { error: 'Invalid model provider' },
        { status: 400 }
      );
    }

    // Different processing based on analysis type
    if (analysisType === 'agent_evaluation') {
      console.log('Redirecting to agent-cv-evaluation with analysisType:', analysisType);
      
      // Create a new FormData for the agent evaluation endpoint
      const agentFormData = new FormData();
      
      // Copy the PDF file
      agentFormData.append('file', pdfFile);
      
      // Combine both checklists for agent evaluation
      const combinedChecklist = `
Summary Checklist:
${summaryChecklistText}

Key Assignments Checklist:
${assignmentsChecklistText}
      `;
      
      // Add the checklist in the format expected by agent-cv-evaluation
      agentFormData.append('checklistText', combinedChecklist);
      console.log('Created checklistText with length:', combinedChecklist.length);
      
      // Copy other necessary parameters
      agentFormData.append('modelProvider', modelProvider);
      agentFormData.append('modelName', modelName);
      
      // Redirect to the agent-cv-evaluation endpoint
      console.log('Calling agent-cv-evaluation endpoint...');
      const response = await fetch(`${new URL(req.url).origin}/api/agent-cv-evaluation`, {
        method: 'POST',
        body: agentFormData,
      });
      
      console.log('agent-cv-evaluation response status:', response.status);
      const data = await response.json();
      console.log('agent-cv-evaluation response data:', Object.keys(data));
      
      // Add the analysis type to the response so we can track it in the frontend
      return NextResponse.json({
        ...data,
        analysisType: 'agent_evaluation'
      });
    } else if (analysisType === 'combined') {
      try {
        // For OpenAI, we can use parallel processing with structured output
        if (modelProvider === 'openai') {
          // System messages for analysis
          const summarySystemMessage = `You are an expert CV evaluator focused on analyzing and improving CV summaries.
          
          Your task is to analyze the CV summary (the top-most paragraph in the CV) and evaluate it against these recommendations:
          
          ${summaryChecklistText}
          
          Provide a detailed evaluation of the summary's strengths and weaknesses, and then create an improved version that follows all the recommendations.`;

          const assignmentsSystemMessage = `You are an expert CV evaluator focused on analyzing and improving Key Assignments descriptions.
          
          Your task is to analyze all the Key Assignments sections in the CV and evaluate them against these recommendations:
          
          ${assignmentsChecklistText}
          
          For each Key Assignment section, provide:
          1. The original text
          2. A brief overview of issues found
          3. An improved version that follows all the recommendations
          
          Also provide an overall assessment of issues found across all assignments.`;

          // Run both analyses in parallel
          const [summaryAnalysis, assignmentsAnalysis] = await Promise.all([
            generateObject({
              model,
              schema: summaryAnalysisSchema,
              system: summarySystemMessage,
              messages: [{
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Please analyze the summary in this CV. Extract the original summary, provide an analysis of its strengths and weaknesses, and create an improved version following all the recommendations in the checklist.',
                  },
                  {
                    type: 'file',
                    data: fileBuffer,
                    mimeType: 'application/pdf',
                    filename: pdfFile.name,
                  }
                ],
              }]
            }).then(result => result.object),
            
            generateObject({
              model,
              schema: assignmentAnalysisSchema,
              system: assignmentsSystemMessage,
              messages: [{
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Please analyze all Key Assignments sections in this CV. Identify each assignment section, extract the original text, provide a brief overview of issues for each, and create improved versions following all the recommendations in the checklist.',
                  },
                  {
                    type: 'file',
                    data: fileBuffer,
                    mimeType: 'application/pdf',
                    filename: pdfFile.name,
                  }
                ],
              }]
            }).then(result => result.object)
          ]);

          // Combine the results
          const combinedResult = {
            summary_analysis: summaryAnalysis,
            assignments_analysis: assignmentsAnalysis
          };

          return NextResponse.json({ 
            result: combinedResult,
            isStructured: true,
            analysisType: 'combined'
          });
        } else {
          // For Anthropic and other providers, we can still process but without structured output
          return NextResponse.json(
            { error: 'Only OpenAI models are supported for structured output analysis' },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('Error processing CV analysis:', error);
        return NextResponse.json(
          { error: 'Error processing CV analysis', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid analysis type' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing CV analysis:', error);
    return NextResponse.json(
      { error: 'Error processing CV analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 