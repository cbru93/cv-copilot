// Set to Edge runtime for better performance
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject } from 'ai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';
import { z } from 'zod';

// Azure Static Web Apps has a 30-second limit for function execution
export const maxDuration = 230; // We set to 60 but Azure might enforce a lower limit

// Enhanced logging function
function logDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  return logMessage;
}

// Environment diagnostics function
function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    openaiKeyExists: !!process.env.OPENAI_API_KEY,
    openaiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
    anthropicKeyExists: !!process.env.ANTHROPIC_API_KEY,
    maxDuration,
  };
}

// Standard headers for API responses
function getResponseHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Content-Type': 'application/json'
  };
}

// Specialized evaluation criteria based on CV hjelper MVP
const evaluationCriteria = [
  {
    id: 'language_quality',
    name: 'Language Quality',
    description: 'Evaluate grammar, spelling, flow, and professional tone. Check if it uses third-person perspective and action-oriented language.'
  },
  {
    id: 'content_completeness',
    name: 'Content Completeness',
    description: 'Check if the CV contains all required elements: summary, projects, technology, competencies, roles, education, courses, certifications, and languages.'
  },
  {
    id: 'summary_quality',
    name: 'Summary Quality',
    description: 'Evaluate the CV summary for strong opening, key skills/experiences, and demonstrated value.'
  },
  {
    id: 'project_descriptions',
    name: 'Project Descriptions',
    description: 'Evaluate project descriptions for proper structure, action-oriented language, role clarity, value contribution, and PARK methodology compliance.'
  },
  {
    id: 'competence_verification',
    name: 'Competence Verification',
    description: 'Verify that all listed competencies and roles are demonstrated in project descriptions.'
  }
];

// Rating schema - using 0 to 10 scale as requested (instead of 0 to 1)
const ratingSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  improved_version: z.string().optional()
});

// Content completeness schema
const contentCompletenessSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  element_verification: z.array(
    z.object({
      element: z.string(),
      present: z.boolean(),
      comment: z.string().optional()
    })
  )
});

// Project descriptions schema
const projectDescriptionsSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  project_evaluations: z.array(
    z.object({
      project_name: z.string(),
      score: z.number().min(0).max(10),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      improved_version: z.string().optional()
    })
  )
});

// Competence verification schema
const competenceVerificationSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  unverified_competencies: z.array(z.string()).optional(),
  unverified_roles: z.array(z.string()).optional()
});

// Summary evaluation schema with improved version
const summaryEvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  improved_version: z.string()
});

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
          generateObject({
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
              For example, use scores like 3.5, 5.7, 8.2 to precisely reflect the quality level.
              
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
          }).then(result => ({
            ...result.object,
            criterion_id: 'language_quality',
            criterion_name: 'Language Quality'
          })).catch(e => {
            logs.push(logDebug('Error in language quality evaluation:', e));
            throw new Error(`Language quality agent failed: ${e instanceof Error ? e.message : String(e)}`);
          }),
          
          // Content Completeness Agent
          generateObject({
            model,
            schema: contentCompletenessSchema,
            system: `You are an expert CV structure and content evaluator.
              Analyze the CV's completeness and verify it contains all standard elements:
              - Summary/Profile
              - Projects/Experience
              - Technology/Technical Skills
              - Competencies/Skills
              - Roles
              - Education
              - Courses/Training
              - Certifications
              - Languages
              
              Rate on a scale from 0-10 where:
              0-3: Many required elements missing
              4-6: Some elements missing or incomplete
              7-10: Most or all elements present with varying degrees of completeness
              
              Be nuanced in your scoring, using the full range from 0-10 rather than just a few discrete values.
              For example, use scores like 3.5, 5.7, 8.2 to precisely reflect the completeness level.
              
              Provide detailed reasoning for your rating, specific suggestions for improvement,
              and a verification table of all elements indicating whether each is present.
              
              ${languageInstruction}`,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please evaluate the content completeness of this CV. Check if it contains all standard elements and identify any missing components.`,
                },
                {
                  type: 'file',
                  data: fileBuffer,
                  mimeType: 'application/pdf',
                  filename: pdfFile.name,
                }
              ],
            }]
          }).then(result => ({
            ...result.object,
            criterion_id: 'content_completeness',
            criterion_name: 'Content Completeness'
          })).catch(e => {
            logs.push(logDebug('Error in content completeness evaluation:', e));
            throw new Error(`Content completeness agent failed: ${e instanceof Error ? e.message : String(e)}`);
          }),
          
          // Summary Quality Agent
          generateObject({
            model,
            schema: summaryEvaluationSchema,
            system: `You are an expert CV summary evaluator.
              Analyze the CV's summary/profile section based on these criteria:
              - Strong opening that clearly describes the person's profession and experience level
              - Inclusion of key skills and experiences relevant to their field
              - Demonstration of value using concrete examples where possible
              - Overall impact and clarity
              
              Rate on a scale from 0-10 where:
              0-3: Poor summary lacking key elements and impact
              4-6: Average summary with some strengths but room for improvement
              7-10: Good to excellent summary that effectively showcases the candidate
              
              Be nuanced in your scoring, using the full range from 0-10 rather than just a few discrete values.
              For example, use scores like 3.5, 5.7, 8.2 to precisely reflect the quality level.
              
              Provide detailed reasoning for your rating, specific suggestions for improvement,
              and create an improved version of the summary that maintains the person's experience
              and skills but enhances the presentation.
              
              Use these guidelines for summary evaluation:
              ${summaryChecklistText}
              
              ${languageInstruction}`,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please evaluate the summary/profile section of this CV and create an improved version.`,
                },
                {
                  type: 'file',
                  data: fileBuffer,
                  mimeType: 'application/pdf',
                  filename: pdfFile.name,
                }
              ],
            }]
          }).then(result => ({
            ...result.object,
            criterion_id: 'summary_quality',
            criterion_name: 'Summary Quality'
          })).catch(e => {
            logs.push(logDebug('Error in summary quality evaluation:', e));
            throw new Error(`Summary quality agent failed: ${e instanceof Error ? e.message : String(e)}`);
          }),
          
          // Project Descriptions Agent
          generateObject({
            model,
            schema: projectDescriptionsSchema,
            system: `You are an expert CV project descriptions evaluator.
              Analyze each project/experience description based on these criteria:
              - Proper structure with clear beginning and end
              - Action-oriented language focusing on deliverables, impact, and results
              - Clear indication of responsibility and role
              - Demonstration of value contribution
              - Following the PARK methodology:
                * Problem statement
                * Areas of responsibility
                * Results achieved
                * Knowledge/competencies utilized
              
              Rate each project on a scale from 0-10 where:
              0-3: Poor description lacking most elements
              4-6: Average description with some strengths but room for improvement
              7-10: Good to excellent description that effectively showcases the experience
              
              Be nuanced in your scoring, using the full range from 0-10 rather than just a few discrete values.
              For example, use scores like 3.5, 5.7, 8.2 to precisely reflect the quality level.
              
              Provide an overall rating, detailed reasoning, specific suggestions for improvement,
              and individual evaluations for each project including strengths and weaknesses.
              For the most problematic project descriptions, provide improved versions.
              
              Use these guidelines for project description evaluation:
              ${assignmentsChecklistText}
              
              ${languageInstruction}`,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please evaluate all project/experience descriptions in this CV. Analyze their structure, language, and effectiveness.`,
                },
                {
                  type: 'file',
                  data: fileBuffer,
                  mimeType: 'application/pdf',
                  filename: pdfFile.name,
                }
              ],
            }]
          }).then(result => ({
            ...result.object,
            criterion_id: 'project_descriptions',
            criterion_name: 'Project Descriptions'
          })).catch(e => {
            logs.push(logDebug('Error in project descriptions evaluation:', e));
            throw new Error(`Project descriptions agent failed: ${e instanceof Error ? e.message : String(e)}`);
          }),
          
          // Competence Verification Agent
          generateObject({
            model,
            schema: competenceVerificationSchema,
            system: `You are an expert CV competence verification specialist.
              Your task is to verify consistency between listed competencies/roles and project descriptions.
              
              Specifically:
              - For all competencies listed in the CV, verify they are demonstrated in at least one project
              - For all roles listed in the CV, verify they are described in at least one project
              
              Rate on a scale from 0-10 where:
              0-3: Many competencies/roles not verified in projects
              4-6: Some competencies/roles not verified in projects
              7-10: Most or all competencies/roles properly verified in projects
              
              Be nuanced in your scoring, using the full range from 0-10 rather than just a few discrete values.
              For example, use scores like 3.5, 5.7, 8.2 to precisely reflect the verification level.
              
              Provide detailed reasoning for your rating, specific suggestions for improvement,
              and lists of any unverified competencies and roles.
              
              ${languageInstruction}`,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please verify the consistency between competencies/roles and project descriptions in this CV. Identify any competencies or roles that are not properly demonstrated in the projects.`,
                },
                {
                  type: 'file',
                  data: fileBuffer,
                  mimeType: 'application/pdf',
                  filename: pdfFile.name,
                }
              ],
            }]
          }).then(result => ({
            ...result.object,
            criterion_id: 'competence_verification',
            criterion_name: 'Competence Verification'
          })).catch(e => {
            logs.push(logDebug('Error in competence verification:', e));
            throw new Error(`Competence verification agent failed: ${e instanceof Error ? e.message : String(e)}`);
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
        if (projectDescriptionsResult.score === 0 && 
            Array.isArray(projectDescriptionsResult.project_evaluations) && 
            projectDescriptionsResult.project_evaluations.length > 0) {
          // Calculate average score from individual project evaluations
          const avgProjectScore = projectDescriptionsResult.project_evaluations.reduce(
            (sum, project) => sum + project.score, 0
          ) / projectDescriptionsResult.project_evaluations.length;
          
          // Update the score
          projectDescriptionsResult.score = parseFloat(avgProjectScore.toFixed(1));
          logs.push(logDebug(`Fixed project descriptions score to ${projectDescriptionsResult.score} based on ${projectDescriptionsResult.project_evaluations.length} project evaluations`));
        }
        
        logs.push(logDebug('Evaluation scores', { 
          languageQuality: languageQualityResult.score,
          contentCompleteness: contentCompletenessResult.score,
          summaryQuality: summaryQualityResult.score,
          projectDescriptions: projectDescriptionsResult.score,
          competenceVerification: competenceVerificationResult.score
        }));
        
        // Combine all agent results
        const criterionEvaluations = [
          languageQualityResult,
          contentCompletenessResult,
          summaryQualityResult,
          projectDescriptionsResult,
          competenceVerificationResult
        ];
        
        // Calculate overall rating
        const overallScore = criterionEvaluations.reduce((sum, criterion) => sum + criterion.score, 0) / criterionEvaluations.length;
        
        logs.push(logDebug(`Calculated overall score: ${overallScore}`));
        
        // Generate summary using the original model
        logs.push(logDebug('Generating overall summary from specialized agent results'));
        
        let overallSummary;
        try {
          const summaryResult = await generateText({
            model,
            system: `You are a CV evaluation coordinator summarizing detailed analysis results. 
              Create a concise, professional summary of the CV evaluation that highlights:
              1. The overall quality level (based on score of ${overallScore.toFixed(1)} out of 10)
              2. Key strengths identified
              3. Priority areas for improvement
              4. Most important action steps
              
              Keep your summary concise and actionable. Focus on the most important findings.
              
              ${languageInstruction}`,
            prompt: `Synthesize these CV evaluation results into a concise summary with key actions:
              ${JSON.stringify(criterionEvaluations, null, 2)}`
          });
          
          overallSummary = summaryResult.text;
          logs.push(logDebug('Overall summary generation completed'));
        } catch (summaryError) {
          logs.push(logDebug('Error generating overall summary:', summaryError));
          // Provide fallback summary if generation fails
          overallSummary = `CV evaluated with overall score ${overallScore.toFixed(1)}/10. Review detailed feedback for specific improvement areas.`;
        }
        
        // Prepare strengths and improvement areas
        const strengths = criterionEvaluations
          .filter(criterion => criterion.score >= 7)
          .flatMap(criterion => {
            const areaName = criterion.criterion_name.toLowerCase();
            return [`Strong ${areaName} (scored ${criterion.score.toFixed(1)}/10)`];
          });
        
        const improvementAreas = criterionEvaluations
          .filter(criterion => criterion.score < 7)
          .sort((a, b) => a.score - b.score)
          .flatMap(criterion => {
            const areaName = criterion.criterion_name.toLowerCase();
            return [`Improve ${areaName} (scored ${criterion.score.toFixed(1)}/10)`];
          });
        
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
            project_descriptions: projectDescriptionsResult,
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