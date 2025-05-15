import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject } from 'ai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';
import { z } from 'zod';

export const maxDuration = 60; // Set to 60 seconds for serverless functions

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
        model = openai(modelName);
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
    
    // For OpenAI models, use parallel processing pattern
    try {
      // Define schemas for each criterion evaluation
      const criterionSchema = z.object({
        criterion_id: z.string(),
        criterion_name: z.string(),
        rating: z.number().min(1).max(10),
        reasoning: z.string(),
        suggestions: z.array(z.string())
      });

      // Run parallel evaluations for each criterion
      const criterionPromises = evaluationCriteria.map(criterion => 
        generateObject({
          model: openai(modelName),
          schema: criterionSchema,
          system: `You are an expert CV evaluator focused specifically on ${criterion.name.toLowerCase()}. 
          ${criterion.description}
          Evaluate only this specific aspect of the CV and provide:
          1. A rating from 1-10
          2. Detailed reasoning for your rating
          3. Specific suggestions for improvement
          
          Consider the following evaluation guidelines:
          ${checklistText}`,
          prompt: `Evaluate the ${criterion.name.toLowerCase()} of this CV. Focus ONLY on this criterion.`,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please evaluate the ${criterion.name.toLowerCase()} of this CV. Provide a detailed assessment with specific feedback.`,
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
        }).then(result => ({
          ...result.object,
          criterion_id: criterion.id,
          criterion_name: criterion.name
        }))
      );

      // Execute all evaluations in parallel
      const criterionRatings = await Promise.all(criterionPromises);

      // Once all individual evaluations are complete, generate a final summary
      const { object: finalEvaluation } = await generateObject({
        model: openai(modelName),
        schema: z.object({
          overall_rating: z.number().min(1).max(10),
          summary: z.string(),
          key_strengths: z.array(z.string()),
          key_improvement_areas: z.array(z.string())
        }),
        system: `You are an expert CV evaluator. Your task is to synthesize detailed evaluations of different aspects of a CV and provide an overall assessment.`,
        prompt: `Based on these detailed evaluations of different aspects of the CV, provide an overall assessment:
        ${JSON.stringify(criterionRatings, null, 2)}
        
        Provide:
        1. An overall rating from 1-10
        2. A summary of your overall evaluation
        3. Key strengths of the CV
        4. Key areas for improvement`,
      });

      // Combine the individual assessments with the overall evaluation
      const result = {
        ...finalEvaluation,
        criterion_ratings: criterionRatings
      };

      // Ensure rating values are valid
      const validatedResult = { 
        ...result,
        overall_rating: Math.max(1, Math.min(10, result.overall_rating || 5)),
        criterion_ratings: result.criterion_ratings.map((criterion: CriterionRating) => ({
          ...criterion,
          rating: Math.max(1, Math.min(10, criterion.rating || 5))
        }))
      };

      return NextResponse.json({ 
        result: validatedResult,
        isStructured: true
      });
    } catch (error) {
      console.error('Error during parallel CV evaluation:', error);
      return NextResponse.json(
        { 
          error: 'Error communicating with AI model API',
          details: error instanceof Error ? error.message : 'Unknown model API error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
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