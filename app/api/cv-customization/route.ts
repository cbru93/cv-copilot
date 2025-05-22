// Set to Edge runtime for better performance
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';
import { cvCustomizationResultSchema } from './schemas';

// Import utility functions
import { 
  logDebug, 
  getEnvironmentInfo, 
  getResponseHeaders
} from './utils';

// Import agents
import {
  runRequirementsAnalysisAgent,
  runProfileCustomizationAgent,
  runCompetenciesCustomizationAgent,
  runProjectsCustomizationAgent,
  runEvaluationAgent,
  runLanguageDetectionAgent
} from './agents';

// Azure Static Web Apps has a 30-second limit for function execution
export const maxDuration = 230; // We set to 230 but Azure might enforce a lower limit

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const startTime = Date.now();
  
  try {
    logs.push(logDebug('Starting CV customization agent'));
    logs.push(logDebug('Environment info', getEnvironmentInfo()));
    
    try {
      const formData = await req.formData();
      const cvFile = formData.get('cvFile') as File;
      const customerFiles = formData.getAll('customerFiles') as File[];
      const modelProvider = formData.get('modelProvider') as ModelProvider;
      const modelName = formData.get('modelName') as string;

      logs.push(logDebug(`Request parameters received`, { 
        cvFileSize: cvFile ? cvFile.size : 'No file',
        cvFileName: cvFile ? cvFile.name : 'No file',
        customerFilesCount: customerFiles?.length || 0,
        modelProvider, 
        modelName
      }));

      if (!cvFile || !customerFiles.length) {
        logs.push(logDebug('Missing required parameters'));
        return NextResponse.json(
          { error: 'Missing required parameters (CV file or customer files)', logs },
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
        logs.push(logDebug(`Unsupported provider for CV customization: ${modelProvider}`));
        return NextResponse.json(
          { error: 'CV customization currently only supports OpenAI models', logs },
          { status: 400, headers: getResponseHeaders() }
        );
      }

      // Read the CV file as ArrayBuffer
      logs.push(logDebug('Reading CV PDF file'));
      let cvBuffer;
      try {
        const cvArrayBuffer = await cvFile.arrayBuffer();
        cvBuffer = Buffer.from(cvArrayBuffer);
        logs.push(logDebug(`CV PDF file converted to buffer, size: ${cvBuffer.length} bytes`));
      } catch (fileError) {
        logs.push(logDebug('Error processing CV PDF file:', fileError));
        return NextResponse.json(
          { 
            error: 'Failed to process CV PDF file', 
            details: fileError instanceof Error ? fileError.message : 'Unknown file processing error',
            logs 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }
      
      // Read the customer files as ArrayBuffer
      logs.push(logDebug('Reading customer PDF files'));
      let customerBuffers = [];
      try {
        for (const file of customerFiles) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          customerBuffers.push({
            name: file.name,
            buffer: buffer
          });
        }
        logs.push(logDebug(`Processed ${customerBuffers.length} customer files`));
      } catch (fileError) {
        logs.push(logDebug('Error processing customer PDF files:', fileError));
        return NextResponse.json(
          { 
            error: 'Failed to process customer PDF files', 
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
      
      // Use OpenAI responses API for PDF support
      const model = openai.responses(modelName);
      logs.push(logDebug(`Configured OpenAI model with responses API: ${modelName}`));
      
      // Detect the language of the CV
      logs.push(logDebug('Detecting language of the CV'));
      let languageDetection;
      try {
        languageDetection = await runLanguageDetectionAgent({
          model: openai(modelName), // Using standard model for language detection
          fileBuffer: cvBuffer,
          fileName: cvFile.name
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
        logs.push(logDebug('Starting CV customization process'));
        
        // Step 1: Analyze customer requirements using direct PDF processing
        logs.push(logDebug('Analyzing customer requirements with native PDF processing'));
        
        // Prepare customer documents as message content with proper typing
        const customerDocsContent = [
          {
            type: 'text' as const,
            text: 'Please analyze these customer documents and extract all requirements:'
          } as const,
          ...customerBuffers.map(file => ({
            type: 'file' as const,
            data: file.buffer,
            mimeType: 'application/pdf',
            filename: file.name
          }))
        ];
        
        const customerRequirements = await runRequirementsAnalysisAgent({
          model,
          customerDocsContent,
          languageInstruction
        });
        
        logs.push(logDebug('Customer requirements analysis completed', {
          mustHaveCount: customerRequirements.must_have_requirements.length,
          shouldHaveCount: customerRequirements.should_have_requirements.length
        }));
        
        // Steps 2-4: Run profile, competencies, and projects customization in parallel
        logs.push(logDebug('Starting parallel customization of profile, competencies, and projects'));
        
        const [customizedProfile, customizedCompetencies, customizedProjects] = await Promise.all([
          // Profile customization
          (async () => {
            logs.push(logDebug('Customizing CV profile with native PDF processing'));
            const result = await runProfileCustomizationAgent({
              model,
              cvBuffer,
              cvFileName: cvFile.name,
              customerRequirements,
              languageInstruction
            });
            logs.push(logDebug('Profile customization completed'));
            return result;
          })(),
          
          // Competencies customization
          (async () => {
            logs.push(logDebug('Customizing competencies with native PDF processing'));
            const result = await runCompetenciesCustomizationAgent({
              model,
              cvBuffer,
              cvFileName: cvFile.name,
              customerRequirements,
              languageInstruction
            });
            logs.push(logDebug('Competencies customization completed', {
              relevantCompetenciesCount: result.relevant_competencies.length,
              additionalSuggestionsCount: result.additional_suggested_competencies.length
            }));
            return result;
          })(),
          
          // Projects customization
          (async () => {
            logs.push(logDebug('Customizing project descriptions with native PDF processing'));
            const result = await runProjectsCustomizationAgent({
              model,
              cvBuffer,
              cvFileName: cvFile.name,
              customerRequirements,
              languageInstruction
            });
            logs.push(logDebug('Project customization completed', {
              projectsCount: result.length
            }));
            return result;
          })()
        ]);
        
        logs.push(logDebug('All parallel customizations completed successfully'));
        
        // Step 5: Evaluate the customized CV
        logs.push(logDebug('Evaluating customized CV against requirements'));
        const evaluation = await runEvaluationAgent({
          model,
          customizedProfile,
          keyCompetencies: customizedCompetencies,
          customizedProjects,
          customerRequirements,
          languageInstruction
        });
        logs.push(logDebug('CV evaluation completed', {
          overallScore: evaluation.overall_score,
          requirementCoverageCount: evaluation.requirement_coverage.length
        }));
        
        // Prepare the final result
        const result = {
          customer_requirements: customerRequirements,
          profile_customization: customizedProfile,
          key_competencies: customizedCompetencies,
          customized_projects: customizedProjects,
          evaluation: evaluation,
          language_code: languageDetection.languageCode
        };
        
        logs.push(logDebug('CV customization completed successfully', {
          timeTaken: `${(Date.now() - startTime) / 1000}s`
        }));
        
        // Validate the result against the schema
        const validatedResult = cvCustomizationResultSchema.parse(result);
        
        return NextResponse.json(
          { 
            result: validatedResult,
            logs,
            timeTaken: `${(Date.now() - startTime) / 1000}s` 
          },
          { headers: getResponseHeaders() }
        );
      } catch (error) {
        logs.push(logDebug('Error during CV customization:', error));
        return NextResponse.json(
          { 
            error: 'Failed to complete CV customization', 
            details: error instanceof Error ? error.message : 'Unknown error during customization',
            logs,
            timeTaken: `${(Date.now() - startTime) / 1000}s` 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }
    } catch (formDataError) {
      logs.push(logDebug('Error processing form data:', formDataError));
      return NextResponse.json(
        { 
          error: 'Failed to process request data', 
          details: formDataError instanceof Error ? formDataError.message : 'Unknown form data error',
          logs 
        },
        { status: 400, headers: getResponseHeaders() }
      );
    }
  } catch (error) {
    logs.push(logDebug('Unhandled error:', error));
    return NextResponse.json(
      { 
        error: 'Unhandled server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        logs 
      },
      { status: 500, headers: getResponseHeaders() }
    );
  }
} 