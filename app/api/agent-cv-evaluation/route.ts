import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, tool } from 'ai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';
import { z } from 'zod';

export const maxDuration = 120; // Extended duration for multi-step agent calls

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

// Type for criteria tools object
interface CriteriaTools {
  [key: string]: any;
}

// Type for criterion rating
interface CriterionRating {
  criterion_id: string;
  criterion_name: string;
  rating: number;
  reasoning: string;
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pdfFile = formData.get('file') as File;
    const checklistText = formData.get('checklistText') as string;
    const modelProvider = formData.get('modelProvider') as ModelProvider;
    const modelName = formData.get('modelName') as string;

    if (!pdfFile || !checklistText) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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

    // Check if provider supports PDF input and agents
    if (modelProvider !== 'openai' && modelProvider !== 'anthropic') {
      return NextResponse.json(
        { error: 'Selected model provider does not support agent-based PDF analysis' },
        { status: 400 }
      );
    }

    // Read the file as ArrayBuffer
    const fileArrayBuffer = await pdfFile.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    // Configure the provider
    let model;
    let isAnthropicModel = false;
    
    switch (modelProvider) {
      case 'openai':
        process.env.OPENAI_API_KEY = config.openai.apiKey;
        model = openai(modelName, { structuredOutputs: true });
        break;
      case 'anthropic':
        process.env.ANTHROPIC_API_KEY = config.anthropic.apiKey;
        // For Anthropic, use a different approach as it doesn't support structured outputs
        isAnthropicModel = true;
        model = anthropic(modelName);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid model provider' },
          { status: 400 }
        );
    }

    // If using Anthropic, we need a different approach as it doesn't fully support tool calling
    if (isAnthropicModel) {
      try {
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
        
        // For Anthropic, return the text directly as we don't have structured output
        return NextResponse.json({ 
          result: text,
          isStructured: false
        });
      } catch (error) {
        console.error('Error processing Anthropic CV evaluation:', error);
        return NextResponse.json(
          { error: 'Error processing CV evaluation with Anthropic' },
          { status: 500 }
        );
      }
    }
    
    // For OpenAI models, continue with tool-based approach
    const criteriaTools: CriteriaTools = {};
    
    evaluationCriteria.forEach(criterion => {
      criteriaTools[`evaluate_${criterion.id}`] = tool({
        description: `Evaluate the ${criterion.name.toLowerCase()} of the CV`,
        parameters: z.object({
          criterion_id: z.string().describe('The ID of the criterion being evaluated'),
          criterion_name: z.string().describe('The name of the criterion being evaluated'),
          reasoning: z.string().describe('Detailed reasoning for the evaluation'),
          rating: z.number().describe('Rating from 1-10, where 1 is poor and 10 is excellent'),
          suggestions: z.array(z.string()).describe('Specific suggestions for improvement')
        }),
        execute: async ({ criterion_id, criterion_name, reasoning, rating, suggestions }) => {
          return {
            criterion_id,
            criterion_name,
            reasoning,
            rating,
            suggestions
          };
        }
      });
    });

    // Add the final answer tool
    criteriaTools['provide_final_evaluation'] = tool({
      description: 'Provide the final comprehensive CV evaluation',
      parameters: z.object({
        overall_rating: z.number().describe('Overall CV rating from 1-10, where 1 is poor and 10 is excellent'),
        summary: z.string().describe('Summary of the CV evaluation'),
        key_strengths: z.array(z.string()).describe('Key strengths of the CV'),
        key_improvement_areas: z.array(z.string()).describe('Key areas for improvement'),
        criterion_ratings: z.array(
          z.object({
            criterion_id: z.string(),
            criterion_name: z.string(),
            rating: z.number().describe('Rating from 1-10'),
            reasoning: z.string(),
            suggestions: z.array(z.string())
          })
        ).describe('Ratings for each evaluation criterion')
      }),
      // No execute function since this is the final output
    });

    // Generate text using the AI SDK with PDF attachment
    let result;
    try {
      result = await generateText({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert CV Evaluator Agent. Your task is to thoroughly analyze a CV and provide detailed feedback.

STEP-BY-STEP PROCESS:
1. Read and understand the CV contents completely
2. For each evaluation criterion, call the appropriate tool to assess that aspect
   - Use the evaluate_overall_structure tool for assessing layout and organization
   - Use the evaluate_summary_quality tool for assessing the CV summary
   - Use the evaluate_experience_description tool for assessing work experiences
   - Use the evaluate_relevance_tailoring tool for assessing relevance to target roles
   - Use the evaluate_skills_presentation tool for assessing how skills are presented
3. After evaluating all criteria, provide a comprehensive evaluation using the provide_final_evaluation tool

RATING GUIDELINES:
- All ratings must be integers between 1 and 10, where:
  - 1-3: Poor (significant improvement needed)
  - 4-5: Below average (several improvements needed)
  - 6-7: Average (some improvements possible)
  - 8-9: Good (minor improvements possible)
  - 10: Excellent (meets all best practices)

EVALUATION CRITERIA CHECKLIST:
${checklistText}

Be specific, detailed, and constructive in your feedback. Provide actionable suggestions that would help improve the CV.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please evaluate this CV thoroughly using the agent tools. Analyze each evaluation criterion and provide a comprehensive assessment with specific feedback.',
              },
              {
                type: 'file',
                data: fileBuffer,
                mimeType: 'application/pdf',
                filename: pdfFile.name,
              }
            ],
          }
        ],
        tools: criteriaTools,
        toolChoice: 'required', // Force the model to use tools
        maxSteps: 10, // Allow multiple steps for the agent to complete its work
      });
    } catch (error) {
      console.error('Error during OpenAI/model API call:', error);
      return NextResponse.json(
        { 
          error: 'Error communicating with AI model API',
          details: error instanceof Error ? error.message : 'Unknown model API error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Safely access the tool calls
    const toolCalls = result.toolCalls || [];
    
    // Find the final evaluation tool call
    const finalEvaluation = toolCalls.find(
      call => call.toolName === 'provide_final_evaluation'
    );

    if (!finalEvaluation) {
      return NextResponse.json(
        { error: 'Failed to generate final evaluation' },
        { status: 500 }
      );
    }

    // Validate the ratings are within range
    const validatedResult = { ...finalEvaluation.args };
    
    // Ensure overall rating is valid
    if (typeof validatedResult.overall_rating === 'number') {
      validatedResult.overall_rating = Math.max(1, Math.min(10, validatedResult.overall_rating));
    } else {
      validatedResult.overall_rating = 5; // Default to middle rating if invalid
    }
    
    // Ensure criterion ratings are valid
    if (Array.isArray(validatedResult.criterion_ratings)) {
      validatedResult.criterion_ratings = validatedResult.criterion_ratings.map((criterion: CriterionRating) => ({
        ...criterion,
        rating: typeof criterion.rating === 'number' 
          ? Math.max(1, Math.min(10, criterion.rating)) 
          : 5
      }));
    }

    return NextResponse.json({ 
      result: validatedResult,
      allToolCalls: toolCalls,
      isStructured: true
    });
  } catch (error) {
    console.error('Error processing agent-based CV evaluation:', error);
    
    // Ensure we always return a proper JSON response with details 
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error during CV evaluation';
      
    return NextResponse.json(
      { 
        error: 'Error processing CV evaluation',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 