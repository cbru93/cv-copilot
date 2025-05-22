// Set to Edge runtime for better performance
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';

// Import utility functions
import { 
  logDebug, 
  getEnvironmentInfo, 
  getResponseHeaders 
} from './utils';

// Import agents
import {
  runLanguageQualityAgent,
  runContentCompletenessAgent,
  runSummaryQualityAgent,
  runProjectDescriptionsAgent,
  runCompetenceVerificationAgent,
  runLanguageDetectionAgent,
  fixProjectDescriptionsScore,
  generateOverallSummary,
  extractStrengths,
  extractImprovementAreas
} from './agents';

// Import schemas
import { evaluationCriteria } from './schemas';

// Azure Static Web Apps has a 30-second limit for function execution
export const maxDuration = 230; // We set to 230 but Azure might enforce a lower limit

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const startTime = Date.now();
  
  try {
    logs.push(logDebug('Starting enhanced CV analysis agent'));
    logs.push(logDebug('Environment info', getEnvironmentInfo()));
    
    try {
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
        modelName,
        summaryChecklistLength: summaryChecklistText ? summaryChecklistText.length : 0,
        assignmentsChecklistLength: assignmentsChecklistText ? assignmentsChecklistText.length : 0
      }));

      if (!pdfFile || !summaryChecklistText || !assignmentsChecklistText) {
        logs.push(logDebug('Missing required parameters'));
        return NextResponse.json(
          { error: 'Missing required parameters', logs },
          { status: 400, headers: getResponseHeaders() }
        );
      }

      // Check if the requested provider is available
      logs.push(logDebug(`Checking if provider is available: ${modelProvider}`));
      if (!isProviderAvailable(modelProvider)) {
        logs.push(logDebug(`API key not configured for provider: ${modelProvider}`));
        return NextResponse.json(
          { 
            error: `${modelProvider} API key is not configured`, 
            logs,
            environment: getEnvironmentInfo() 
          },
          { status: 400, headers: getResponseHeaders() }
        );
      }
      logs.push(logDebug(`Provider ${modelProvider} is available`));

      // Currently only supporting OpenAI models for agent-based analysis
      if (modelProvider !== 'openai') {
        logs.push(logDebug(`Unsupported provider for enhanced agent-based analysis: ${modelProvider}`));
        return NextResponse.json(
          { error: 'Enhanced agent-based analysis currently only supports OpenAI models', logs },
          { status: 400, headers: getResponseHeaders() }
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
          { 
            error: 'Failed to process PDF file', 
            details: fileError instanceof Error ? fileError.message : 'Unknown file processing error',
            logs 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }

      // Configure the provider
      logs.push(logDebug(`Setting OpenAI API key from config`));
      const openaiKeyBefore = !!process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = config.openai.apiKey;
      const openaiKeyAfter = !!process.env.OPENAI_API_KEY;
      logs.push(logDebug(`OpenAI key status: before=${openaiKeyBefore}, after=${openaiKeyAfter}, key_length=${config.openai.apiKey?.length || 0}`));
      
      if (!process.env.OPENAI_API_KEY) {
        logs.push(logDebug('OpenAI API key is not set after configuration attempt'));
        return NextResponse.json(
          { 
            error: 'OpenAI API key is not available', 
            logs, 
            environment: getEnvironmentInfo() 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }
      
      const model = openai(modelName);
      logs.push(logDebug(`Configured OpenAI model: ${modelName}`));
      
      // Detect the language of the CV
      logs.push(logDebug('Detecting language of the CV'));
      let languageDetection;
      try {
        languageDetection = await runLanguageDetectionAgent({
          model,
          fileBuffer,
          fileName: pdfFile.name
        });
        logs.push(logDebug(`Language detected: ${languageDetection.language} (${languageDetection.languageCode}) with ${languageDetection.confidence * 100}% confidence`));
      } catch (langError) {
        logs.push(logDebug('Error detecting language:', langError));
        return NextResponse.json(
          { 
            error: 'Failed to detect document language, possible API connection issue', 
            details: langError instanceof Error ? langError.message : 'Unknown language detection error',
            logs,
            timeTaken: `${(Date.now() - startTime) / 1000}s` 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }
      
      // Create language instruction to add to all system prompts
      const languageInstruction = `IMPORTANT: Provide all analysis, feedback, and suggestions in ${languageDetection.language} language to match the language of the CV.`;
      
      try {
        logs.push(logDebug('Starting parallel agent-based CV analysis'));
        
        // Run specialized agents in parallel
        logs.push(logDebug('Launching specialized agents for CV analysis'));
        
        const [
          languageQualityResult,
          contentCompletenessResult,
          summaryQualityResult,
          projectDescriptionsResult,
          competenceVerificationResult
        ] = await Promise.all([
          // Language Quality Agent
          runLanguageQualityAgent({
            model,
            fileBuffer,
            fileName: pdfFile.name,
            languageInstruction
          }),
          
          // Content Completeness Agent
          runContentCompletenessAgent({
            model,
            fileBuffer,
            fileName: pdfFile.name,
            languageInstruction
          }),
          
          // Summary Quality Agent
          runSummaryQualityAgent({
            model,
            fileBuffer,
            fileName: pdfFile.name,
            languageInstruction,
            summaryChecklistText
          }),
          
          // Project Descriptions Agent
          runProjectDescriptionsAgent({
            model,
            fileBuffer,
            fileName: pdfFile.name,
            languageInstruction,
            assignmentsChecklistText
          }),
          
          // Competence Verification Agent
          runCompetenceVerificationAgent({
            model,
            fileBuffer,
            fileName: pdfFile.name,
            languageInstruction
          })
        ]);
        
        logs.push(logDebug('All specialized agents completed successfully'));
        
        // Add a debug log for project descriptions
        logs.push(logDebug('Project descriptions result details', {
          overall_score: projectDescriptionsResult.score,
          has_evaluations: Array.isArray(projectDescriptionsResult.project_evaluations),
          num_evaluations: Array.isArray(projectDescriptionsResult.project_evaluations) ? projectDescriptionsResult.project_evaluations.length : 0
        }));
        
        // Fix for project descriptions scoring issues
        const fixedProjectDescriptionsResult = fixProjectDescriptionsScore(projectDescriptionsResult);
        if (fixedProjectDescriptionsResult.score !== projectDescriptionsResult.score) {
          logs.push(logDebug(`Fixed project descriptions score to ${fixedProjectDescriptionsResult.score} based on ${fixedProjectDescriptionsResult.project_evaluations.length} project evaluations`));
        }
        
        logs.push(logDebug('Evaluation scores', { 
          languageQuality: languageQualityResult.score,
          contentCompleteness: contentCompletenessResult.score,
          summaryQuality: summaryQualityResult.score,
          projectDescriptions: fixedProjectDescriptionsResult.score,
          competenceVerification: competenceVerificationResult.score
        }));
        
        // Combine all agent results
        const criterionEvaluations = [
          languageQualityResult,
          contentCompletenessResult,
          summaryQualityResult,
          fixedProjectDescriptionsResult,
          competenceVerificationResult
        ];
        
        // Calculate overall rating
        const overallScore = criterionEvaluations.reduce((sum, criterion) => sum + criterion.score, 0) / criterionEvaluations.length;
        
        logs.push(logDebug(`Calculated overall score: ${overallScore}`));
        
        // Generate summary 
        logs.push(logDebug('Generating overall summary from specialized agent results'));
        const overallSummary = await generateOverallSummary(
          model, 
          criterionEvaluations, 
          overallScore, 
          languageInstruction
        );
        logs.push(logDebug('Overall summary generation completed'));
        
        // Prepare strengths and improvement areas
        const strengths = extractStrengths(criterionEvaluations);
        const improvementAreas = extractImprovementAreas(criterionEvaluations);
        
        // Combine the results into the final evaluation structure
        const result = {
          overall_score: parseFloat(overallScore.toFixed(1)),
          summary: overallSummary,
          key_strengths: strengths.length > 0 ? strengths : ["No specific strengths identified"],
          key_improvement_areas: improvementAreas.length > 0 ? improvementAreas : ["No specific improvement areas identified"],
          criterion_evaluations: criterionEvaluations,
          detailed_analysis: {
            language_quality: languageQualityResult,
            content_completeness: contentCompletenessResult,
            summary_quality: summaryQualityResult,
            project_descriptions: fixedProjectDescriptionsResult,
            competence_verification: competenceVerificationResult
          }
        };
        
        const timeTaken = (Date.now() - startTime) / 1000;
        logs.push(logDebug(`Completed processing in ${timeTaken}s, returning successful response`));
        
        return NextResponse.json({ 
          result,
          isStructured: true,
          debug: { logs },
          timeTaken: `${timeTaken}s`
        }, { headers: getResponseHeaders() });
      } catch (error) {
        logs.push(logDebug('Error during agent-based CV analysis:', error));
        return NextResponse.json(
          { 
            error: 'Error communicating with AI model API',
            details: error instanceof Error ? error.message : 'Unknown model API error',
            timestamp: new Date().toISOString(),
            environment: getEnvironmentInfo(),
            logs,
            timeTaken: `${(Date.now() - startTime) / 1000}s`
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }
    } catch (formError) {
      logs.push(logDebug('Error processing form data:', formError));
      return NextResponse.json(
        { 
          error: 'Error processing request form data',
          details: formError instanceof Error ? formError.message : 'Unknown form processing error',
          logs,
          environment: getEnvironmentInfo(),
          timeTaken: `${(Date.now() - startTime) / 1000}s` 
        },
        { status: 500, headers: getResponseHeaders() }
      );
    }
  } catch (error) {
    const errorTime = (Date.now() - startTime) / 1000;
    logs.push(logDebug('Unhandled error in enhanced CV analysis:', error));
    
    // Ensure we always return a proper JSON response with details 
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error during CV evaluation';
      
    return NextResponse.json(
      { 
        error: 'Error processing CV evaluation',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        environment: getEnvironmentInfo(),
        logs,
        timeTaken: `${errorTime}s`
      },
      { status: 500, headers: getResponseHeaders() }
    );
  }
} 