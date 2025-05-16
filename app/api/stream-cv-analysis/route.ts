import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';
import { z } from 'zod';

export const maxDuration = 60; // Allow up to 60 seconds for processing

// Schema for our streaming analysis
const streamingSummaryAnalysisSchema = z.object({
  original_summary: z.string().optional(),
  analysis: z.string().optional(),
  improved_summary: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pdfFile = formData.get('file') as File;
    const summaryChecklistText = formData.get('summaryChecklistText') as string;
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
      : null;

    if (!model) {
      return NextResponse.json(
        { error: 'Invalid model provider' },
        { status: 400 }
      );
    }

    // System message for analysis
    const systemMessage = `You are an expert CV evaluator focused on analyzing and improving CV summaries.
    
    Your task is to analyze the CV summary (the top-most paragraph in the CV) and evaluate it against these recommendations:
    
    ${summaryChecklistText}
    
    Provide a detailed evaluation of the summary's strengths and weaknesses, and then create an improved version that follows all the recommendations.
    
    CRITICAL STREAMING INSTRUCTIONS:
    - You MUST stream your output token-by-token in real-time
    - Start populating ALL THREE fields (original_summary, analysis, improved_summary) SIMULTANEOUSLY
    - For original_summary: Begin with "I can see the original summary is..." and start transcribing immediately
    - For analysis: Begin with "Initial analysis shows..." and start analyzing immediately 
    - For improved_summary: Begin with "Starting to formulate improvements..." and start suggesting immediate changes
    
    DO NOT wait to complete any section before working on others. Work on all three sections concurrently, adding to each field as thoughts come to you.
    
    Consider this a real-time, word-by-word dictation process. The user needs to see progress in all three fields simultaneously, not sequentially.`;

    // Use streamObject to stream the analysis
    const result = streamObject({
      model,
      schema: streamingSummaryAnalysisSchema,
      system: systemMessage,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please analyze the summary in this CV. Extract the original summary, provide an analysis of its strengths and weaknesses, and create an improved version following all the recommendations in the checklist. Stream your thoughts on all three aspects (original summary, analysis, and improvements) simultaneously - don\'t wait for one to be complete before working on the others.',
          },
          {
            type: 'file',
            data: fileBuffer,
            mimeType: 'application/pdf',
            filename: pdfFile.name,
          }
        ],
      }]
    });

    // Return a data stream response instead of a custom implementation
    return new Response(result.textStream);

  } catch (error) {
    console.error('Error processing streaming CV analysis:', error);
    return NextResponse.json(
      { error: 'Error processing streaming CV analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 