import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject } from 'ai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';
import { z } from 'zod';

export const maxDuration = 230; // Set to 60 seconds for serverless functions

// Enhanced logging function that works in production
function logDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  // In production, these logs will show up in the Vercel logs
  // For client-side visibility, we'll return some of these in the error responses
  return logMessage;
}

// CV evaluation criteria
const evaluationCriteria = [
  {
    id: 'overall_structure',
    name: 'Overall Structure and Layout',
    description: 'Evaluate the CV structure, organization, and visual layout.'
  },
  {
    id: 'summary_quality',
    name: 'Summary Quality',
    description: 'Evaluate the CV summary (personal statement) for clarity, relevance, and impact.'
  },
  {
    id: 'experience_description',
    name: 'Experience Description',
    description: 'Evaluate how work experiences are described, focusing on clarity, achievement orientation, and quantification.'
  },
  {
    id: 'relevance_tailoring',
    name: 'Relevance and Tailoring',
    description: 'Evaluate how well the CV is tailored to the industry or specific roles.'
  },
  {
    id: 'skills_presentation',
    name: 'Skills Presentation',
    description: 'Evaluate how technical and soft skills are presented and substantiated.'
  }
];

// Type for criterion rating
interface CriterionRating {
  criterion_id: string;
  criterion_name: string;
  rating: number;
  reasoning: string;
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  try {
    logs.push(logDebug('Starting CV evaluation API route'));
    
    const formData = await req.formData();
    const pdfFile = formData.get('file') as File;
    const checklistText = formData.get('checklistText') as string;
    const modelProvider = formData.get('modelProvider') as ModelProvider;
    const modelName = formData.get('modelName') as string;

    logs.push(logDebug(`Request parameters received`, { 
      fileSize: pdfFile ? pdfFile.size : 'No file',
      fileName: pdfFile ? pdfFile.name : 'No file',
      modelProvider, 
      modelName,
      checklistLength: checklistText ? checklistText.length : 0
    }));

    if (!pdfFile || !checklistText) {
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

    // Check if provider supports PDF input and agents
    if (modelProvider !== 'openai' && modelProvider !== 'anthropic') {
      logs.push(logDebug(`Unsupported provider for agent-based analysis: ${modelProvider}`));
      return NextResponse.json(
        { error: 'Selected model provider does not support agent-based PDF analysis', logs },
        { status: 400 }
      );
    }

    // Read the file as ArrayBuffer
    logs.push(logDebug('Reading PDF file'));
    const fileArrayBuffer = await pdfFile.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    logs.push(logDebug(`PDF file converted to buffer, size: ${fileBuffer.length} bytes`));

    // Configure the provider
    let model;
    let isAnthropicModel = false;
    
    switch (modelProvider) {
      case 'openai':
        process.env.OPENAI_API_KEY = config.openai.apiKey;
        model = openai(modelName);
        logs.push(logDebug(`Configured OpenAI model: ${modelName}`));
        break;
      case 'anthropic':
        process.env.ANTHROPIC_API_KEY = config.anthropic.apiKey;
        isAnthropicModel = true;
        model = anthropic(modelName);
        logs.push(logDebug(`Configured Anthropic model: ${modelName}`));
        break;
      default:
        logs.push(logDebug(`Invalid model provider: ${modelProvider}`));
        return NextResponse.json(
          { error: 'Invalid model provider', logs },
          { status: 400 }
        );
    }

    // If using Anthropic, we need a different approach as it doesn't fully support tool calling
    if (isAnthropicModel) {
      logs.push(logDebug('Using Anthropic processing path'));
      try {
        logs.push(logDebug('Starting Anthropic text generation'));
        const { text } = await generateText({
          model,
          messages: [
            {
              role: 'system',
              content: `You are an expert CV Evaluator. Your task is to thoroughly analyze a CV and provide detailed feedback.
              
              Please evaluate the CV across these 5 criteria:
              1. Overall Structure and Layout
              2. Summary Quality
              3. Experience Description
              4. Relevance and Tailoring
              5. Skills Presentation
              
              For each criterion:
              - Provide a rating from 1-10
              - Give detailed reasoning
              - Offer specific suggestions for improvement
              
              Then provide an overall evaluation with:
              - An overall rating from 1-10
              - A summary of your evaluation
              - Key strengths
              - Key areas for improvement
              
              Format your response in a structured way that's easy to parse.
              
              EVALUATION CRITERIA CHECKLIST:
              ${checklistText}
              
              Be specific, detailed, and constructive in your feedback.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please evaluate this CV thoroughly. Analyze each criterion and provide a comprehensive assessment with specific feedback.',
                },
                {
                  type: 'file',
                  data: fileBuffer,
                  mimeType: 'application/pdf',
                  filename: pdfFile.name,
                }
              ],
            }
          ]
        });
        
        logs.push(logDebug('Anthropic generation completed successfully'));
        
        // For Anthropic, return the text directly as we don't have structured output
        return NextResponse.json({ 
          result: text,
          isStructured: false,
          debug: { logs }
        });
      } catch (error) {
        logs.push(logDebug('Error processing Anthropic CV evaluation:', error));
        return NextResponse.json(
          { 
            error: 'Error processing CV evaluation with Anthropic', 
            details: error instanceof Error ? error.message : 'Unknown error',
            logs 
          },
          { status: 500 }
        );
      }
    }
    
    // For OpenAI models, use parallel processing pattern similar to the example
    try {
      logs.push(logDebug('Starting OpenAI parallel processing path'));
      
      // Define schema for criterion evaluation
      const criterionSchema = z.object({
            criterion_id: z.string(),
            criterion_name: z.string(),
        rating: z.number().min(1).max(10),
            reasoning: z.string(),
            suggestions: z.array(z.string())
      });

      logs.push(logDebug('Set up schema for criterion evaluations'));
      
      // Following the example pattern more closely - evaluate all criteria in parallel
      logs.push(logDebug('Starting parallel evaluation of all 5 criteria'));
      
      // Create the system prompts for each criterion
      const structureSystemPrompt = `You are an expert CV evaluator focused on Overall Structure and Layout. 
        Evaluate only this specific aspect of the CV and provide:
        1. A rating from 1-10
        2. Detailed reasoning for your rating
        3. Specific suggestions for improvement
        
        Consider the following evaluation guidelines:
        ${checklistText}`;
      
      const summarySystemPrompt = `You are an expert CV evaluator focused on Summary Quality. 
        Evaluate only this specific aspect of the CV and provide:
        1. A rating from 1-10
        2. Detailed reasoning for your rating
        3. Specific suggestions for improvement
        
        Consider the following evaluation guidelines:
        ${checklistText}`;
      
      const experienceSystemPrompt = `You are an expert CV evaluator focused on Experience Description. 
        Evaluate only this specific aspect of the CV and provide:
        1. A rating from 1-10
        2. Detailed reasoning for your rating
        3. Specific suggestions for improvement
        
        Consider the following evaluation guidelines:
        ${checklistText}`;

      const relevanceSystemPrompt = `You are an expert CV evaluator focused on Relevance and Tailoring. 
        Evaluate only this specific aspect of the CV and provide:
        1. A rating from 1-10
        2. Detailed reasoning for your rating
        3. Specific suggestions for improvement
        
        Consider the following evaluation guidelines:
        ${checklistText}`;
      
      const skillsSystemPrompt = `You are an expert CV evaluator focused on Skills Presentation. 
        Evaluate only this specific aspect of the CV and provide:
        1. A rating from 1-10
        2. Detailed reasoning for your rating
        3. Specific suggestions for improvement
        
        Consider the following evaluation guidelines:
        ${checklistText}`;
      
      logs.push(logDebug('Running all 5 criterion evaluations in parallel...'));
      
      // Run all evaluations in parallel
      const [structureResult, summaryResult, experienceResult, relevanceResult, skillsResult] = await Promise.all([
        // Structure evaluation
        generateObject({
          model: openai(modelName),
          schema: criterionSchema,
          system: structureSystemPrompt,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please evaluate the overall structure and layout of this CV. Provide a detailed assessment with specific feedback.`,
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
          criterion_id: 'overall_structure',
          criterion_name: 'Overall Structure and Layout'
        })).catch(e => {
          logs.push(logDebug('Error in structure evaluation:', e));
          throw e;
        }),
        
        // Summary evaluation
        generateObject({
          model: openai(modelName),
          schema: criterionSchema,
          system: summarySystemPrompt,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please evaluate the summary quality of this CV. Provide a detailed assessment with specific feedback.`,
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
          logs.push(logDebug('Error in summary evaluation:', e));
          throw e;
        }),
        
        // Experience evaluation
        generateObject({
          model: openai(modelName),
          schema: criterionSchema,
          system: experienceSystemPrompt,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please evaluate the experience descriptions in this CV. Provide a detailed assessment with specific feedback.`,
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
          criterion_id: 'experience_description',
          criterion_name: 'Experience Description'
        })).catch(e => {
          logs.push(logDebug('Error in experience evaluation:', e));
          throw e;
        }),

        // Relevance evaluation
        generateObject({
          model: openai(modelName),
          schema: criterionSchema,
          system: relevanceSystemPrompt,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please evaluate the relevance and tailoring of this CV. Provide a detailed assessment with specific feedback.`,
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
          criterion_id: 'relevance_tailoring',
          criterion_name: 'Relevance and Tailoring'
        })).catch(e => {
          logs.push(logDebug('Error in relevance evaluation:', e));
          throw e;
        }),
        
        // Skills evaluation
        generateObject({
          model: openai(modelName),
          schema: criterionSchema,
          system: skillsSystemPrompt,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please evaluate the skills presentation in this CV. Provide a detailed assessment with specific feedback.`,
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
          criterion_id: 'skills_presentation',
          criterion_name: 'Skills Presentation'
        })).catch(e => {
          logs.push(logDebug('Error in skills evaluation:', e));
          throw e;
        })
      ]);
      
      logs.push(logDebug('All criterion evaluations completed successfully'));
      logs.push(logDebug('Evaluation results', { 
        structureRating: structureResult.rating,
        summaryRating: summaryResult.rating,
        experienceRating: experienceResult.rating,
        relevanceRating: relevanceResult.rating,
        skillsRating: skillsResult.rating
      }));
      
      // Combine all criterion evaluation results
      const criterionEvaluations = [
        structureResult,
        summaryResult,
        experienceResult,
        relevanceResult,
        skillsResult
      ];
      
      // Calculate overall rating and create summary
      const overallRating = Math.round(
        criterionEvaluations.reduce((sum, criterion) => sum + criterion.rating, 0) / criterionEvaluations.length
      );
      
      logs.push(logDebug(`Calculated overall rating: ${overallRating}`));
      
      // Prepare the final result without making another API call
      const highRatedCriteria = criterionEvaluations
        .filter(criterion => criterion.rating >= 7)
        .sort((a, b) => b.rating - a.rating);
      
      const lowRatedCriteria = criterionEvaluations
        .filter(criterion => criterion.rating < 7)
        .sort((a, b) => a.rating - b.rating);
      
      const key_strengths = highRatedCriteria.length > 0 
        ? highRatedCriteria.flatMap(criterion => 
            criterion.suggestions.length > 0 
              ? [`Strong ${criterion.criterion_name.toLowerCase()} (rated ${criterion.rating}/10)`] 
              : []
          )
        : ["No specific strengths identified"];
      
      const key_improvement_areas = lowRatedCriteria.length > 0
        ? lowRatedCriteria.flatMap(criterion => 
            criterion.suggestions.length > 0 
              ? [`Improve ${criterion.criterion_name.toLowerCase()} (rated ${criterion.rating}/10)`] 
              : []
          )
        : ["No specific improvement areas identified"];
      
      // Create summary based on overall rating
      let summary = `This CV has received an overall rating of ${overallRating}/10. `;
      
      if (overallRating >= 8) {
        summary += "Overall, this is a strong CV that effectively showcases the candidate's qualifications and experience.";
      } else if (overallRating >= 6) {
        summary += "This CV adequately presents the candidate's background but has room for improvement in certain areas.";
      } else {
        summary += "This CV needs significant improvement to effectively showcase the candidate's qualifications and experience.";
      }
      
      logs.push(logDebug('Final result preparation completed'));
      
      // Combine the results into the final evaluation structure
      const result = {
        overall_rating: overallRating,
        summary,
        key_strengths: key_strengths.slice(0, 5),  // Limit to 5 strengths
        key_improvement_areas: key_improvement_areas.slice(0, 5),  // Limit to 5 improvement areas
        criterion_ratings: criterionEvaluations
      };
      
      logs.push(logDebug('Returning successful response'));
      
      return NextResponse.json({ 
        result,
        isStructured: true,
        debug: { logs }
      });
    } catch (error) {
      logs.push(logDebug('Error during parallel CV evaluation:', error));
      return NextResponse.json(
        { 
          error: 'Error communicating with AI model API',
          details: error instanceof Error ? error.message : 'Unknown model API error',
          timestamp: new Date().toISOString(),
          logs
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logs.push(logDebug('Error processing agent-based CV evaluation:', error));
    
    // Ensure we always return a proper JSON response with details 
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error during CV evaluation';
      
    return NextResponse.json(
      { 
        error: 'Error processing CV evaluation',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        logs
      },
      { status: 500 }
    );
  }
} 