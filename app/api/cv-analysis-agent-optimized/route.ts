import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText, generateObject } from 'ai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';
import { z } from 'zod';

// Set maximum duration for the function
export const maxDuration = 60;

// Use Edge runtime for faster cold starts
export const runtime = 'edge';

// Enhanced logging function with environment info
function logDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  return logMessage;
}

// Rating schema - using 0 to 10 scale
const ratingSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  improved_version: z.string().optional()
});

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const startTime = Date.now();
  
  try {
    logs.push(logDebug('Starting simplified CV analysis agent'));
    
    // Parse the form data
    const formData = await req.formData();
    const pdfFile = formData.get('file') as File;
    const summaryChecklistText = formData.get('summaryChecklistText') as string;
    const assignmentsChecklistText = formData.get('assignmentsChecklistText') as string;
    const modelProvider = formData.get('modelProvider') as ModelProvider;
    const modelName = formData.get('modelName') as string;
    
    logs.push(logDebug(`Request parameters received`, { 
      fileSize: pdfFile ? pdfFile.size : 'No file',
      fileName: pdfFile ? pdfFile.name : 'No file',
      modelProvider,
      modelName
    }));

    if (!pdfFile || !summaryChecklistText || !assignmentsChecklistText) {
      logs.push(logDebug('Missing required parameters'));
      return NextResponse.json(
        { error: 'Missing required parameters', logs },
        { status: 400 }
      );
    }

    // Check if the requested provider is available
    if (!isProviderAvailable(modelProvider)) {
      logs.push(logDebug(`API key not configured for provider: ${modelProvider}`));
      return NextResponse.json(
        { error: `${modelProvider} API key is not configured`, logs },
        { status: 400 }
      );
    }

    // Currently only supporting OpenAI models for this test
    if (modelProvider !== 'openai') {
      logs.push(logDebug(`Unsupported provider for analysis: ${modelProvider}`));
      return NextResponse.json(
        { error: 'This endpoint only supports OpenAI models', logs },
        { status: 400 }
      );
    }

    // Read the file as ArrayBuffer
    logs.push(logDebug('Reading PDF file'));
    let fileBuffer;
    try {
      const fileArrayBuffer = await pdfFile.arrayBuffer();
      fileBuffer = Buffer.from(fileArrayBuffer);
      logs.push(logDebug(`PDF file converted to buffer, size: ${fileBuffer.length} bytes`));
    } catch (fileError) {
      logs.push(logDebug('Error processing PDF file:', fileError));
      return NextResponse.json(
        { error: 'Failed to process PDF file', logs },
        { status: 500 }
      );
    }

    // Configure the provider
    logs.push(logDebug(`Setting OpenAI API key from config`));
    process.env.OPENAI_API_KEY = config.openai.apiKey;
    
    if (!process.env.OPENAI_API_KEY) {
      logs.push(logDebug('OpenAI API key is not set after configuration attempt'));
      return NextResponse.json(
        { error: 'OpenAI API key is not available', logs },
        { status: 500 }
      );
    }
    
    const model = openai(modelName);
    logs.push(logDebug(`Configured OpenAI model: ${modelName}`));
    
    // Detect the language of the CV - this is a lightweight call
    logs.push(logDebug('Detecting language of the CV'));
    let languageDetection;
    try {
      const languageResult = await generateObject({
        model,
        schema: z.object({
          language: z.string().describe('The detected language name (e.g., English, Norwegian, German)'),
          languageCode: z.string().describe('The ISO language code (e.g., en, no, de)'),
          confidence: z.number().min(0).max(1).describe('Confidence level of detection')
        }),
        system: 'You are a language detection specialist. Analyze the document and identify the primary language used.',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What language is this document written in? Provide the language name, ISO code, and your confidence level.',
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
      
      languageDetection = languageResult.object;
      logs.push(logDebug(`Language detected: ${languageDetection.language} (${languageDetection.languageCode}) with ${languageDetection.confidence * 100}% confidence`));
    } catch (langError) {
      logs.push(logDebug('Error detecting language:', langError));
      return NextResponse.json(
        { error: 'Failed to detect document language', logs },
        { status: 500 }
      );
    }
    
    // Create language instruction to add to all system prompts
    const languageInstruction = `IMPORTANT: Provide all analysis, feedback, and suggestions in ${languageDetection.language} language to match the language of the CV.`;
    
    // Instead of running 5 operations in parallel, run just one simple analysis
    // This is to test if the issue is with parallel processing or something else
    logs.push(logDebug('Starting simple language quality analysis'));
    
    let languageQualityResult;
    try {
      languageQualityResult = await generateObject({
        model,
        schema: ratingSchema,
        system: `You are an expert language quality evaluator for CVs.
          Analyze the CV's language quality including:
          - Grammar and spelling correctness
          - Professional tone and language
          - Use of third-person perspective
          - Action-oriented language and good flow
          - Conciseness and clarity
          
          Rate on a scale from 0-10 where:
          0-3: Poor quality with many issues
          4-6: Average quality with some issues
          7-10: Good to excellent quality with minimal or no issues
          
          Be nuanced in your scoring, using the full range from 0-10 rather than just a few discrete values.
          
          Provide detailed reasoning for your rating and specific suggestions for improvement.
          Where applicable, provide an improved version of problematic text.
          
          ${languageInstruction}`,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please evaluate the language quality of this CV. Focus on grammar, spelling, flow, professional tone, third-person perspective, and action-oriented language.`,
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
      
      languageQualityResult = {
        ...languageQualityResult.object,
        criterion_id: 'language_quality',
        criterion_name: 'Language Quality'
      };
      
      logs.push(logDebug('Language quality analysis completed successfully'));
    } catch (analysisError) {
      logs.push(logDebug('Error in language quality analysis:', analysisError));
      return NextResponse.json(
        { error: 'Error performing language quality analysis', logs },
        { status: 500 }
      );
    }
    
    // Generate a short summary using the original model
    logs.push(logDebug('Generating overall summary'));
    
    let overallSummary;
    try {
      const summaryResult = await generateText({
        model,
        system: `You are a CV evaluation coordinator. 
          Create a very brief summary of the CV evaluation highlighting key points.
          Keep your summary under 100 words.
          
          ${languageInstruction}`,
        prompt: `Synthesize this CV evaluation result into a concise summary:
          ${JSON.stringify(languageQualityResult, null, 2)}`
      });
      
      overallSummary = summaryResult.text;
      logs.push(logDebug('Overall summary generation completed'));
    } catch (summaryError) {
      logs.push(logDebug('Error generating overall summary:', summaryError));
      overallSummary = `CV evaluated with overall score ${languageQualityResult.score.toFixed(1)}/10. Review detailed feedback for specific improvement areas.`;
    }
    
    // Prepare the result structure
    const result = {
      overall_score: languageQualityResult.score,
      summary: overallSummary,
      key_strengths: languageQualityResult.score >= 7 ? 
        [`Strong language quality (scored ${languageQualityResult.score.toFixed(1)}/10)`] : 
        ["No specific strengths identified"],
      key_improvement_areas: languageQualityResult.score < 7 ? 
        [`Improve language quality (scored ${languageQualityResult.score.toFixed(1)}/10)`] : 
        ["No specific improvement areas identified"],
      criterion_evaluations: [languageQualityResult],
      detailed_analysis: {
        language_quality: languageQualityResult
      }
    };
    
    const timeTaken = (Date.now() - startTime) / 1000;
    logs.push(logDebug(`Completed processing in ${timeTaken}s, returning successful response`));
    
    return NextResponse.json({ 
      result,
      isStructured: true,
      debug: { logs },
      timeTaken: `${timeTaken}s`
    });
    
  } catch (error) {
    const errorTime = (Date.now() - startTime) / 1000;
    logs.push(logDebug('Unhandled error in CV analysis:', error));
    
    return NextResponse.json(
      { 
        error: 'Error processing CV evaluation',
        details: error instanceof Error ? error.message : 'Unknown error',
        logs,
        timeTaken: `${errorTime}s`
      },
      { status: 500 }
    );
  }
} 