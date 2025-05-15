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
      // To avoid overloading the serverless function, evaluate only the first 3 criteria in parallel
      // and then the remaining 2 to distribute the load
      const firstBatchCriteria = evaluationCriteria.slice(0, 3);
      const secondBatchCriteria = evaluationCriteria.slice(3);

      // Process first batch
      const firstBatchPromises = firstBatchCriteria.map(criterion => 
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

      const firstBatchResults = await Promise.all(firstBatchPromises);

      // Process second batch
      const secondBatchPromises = secondBatchCriteria.map(criterion => 
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

      const secondBatchResults = await Promise.all(secondBatchPromises);
      
      // Combine results from both batches
      const criterionRatings = [...firstBatchResults, ...secondBatchResults];

      // Calculate overall rating from the individual criteria (no separate API call)
      const overallRating = Math.round(
        criterionRatings.reduce((sum, criterion) => sum + criterion.rating, 0) / criterionRatings.length
      );

      // Extract key strengths based on highest rated criteria
      const highRatedCriteria = criterionRatings
        .filter(criterion => criterion.rating >= 7)
        .sort((a, b) => b.rating - a.rating);
      
      // Extract areas for improvement based on lowest rated criteria
      const lowRatedCriteria = criterionRatings
        .filter(criterion => criterion.rating < 7)
        .sort((a, b) => a.rating - b.rating);

      // Generate key strengths and improvement areas from the criteria ratings
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

      // Combine the results into the final evaluation structure
      const result = {
        overall_rating: overallRating,
        summary,
        key_strengths: key_strengths.slice(0, 5),  // Limit to 5 strengths
        key_improvement_areas: key_improvement_areas.slice(0, 5),  // Limit to 5 improvement areas
        criterion_ratings: criterionRatings
      };

      return NextResponse.json({ 
        result,
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