import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import { logDebug } from '../utils';

// Define the AgentResult interface directly to avoid circular imports
export interface AgentResult {
  score: number;
  reasoning: string;
  suggestions: string[];
  criterion_id: string;
  criterion_name: string;
  [key: string]: any;
}

/**
 * Generate an overall summary based on all agent results
 */
export async function generateOverallSummary(
  model: LanguageModel,
  criterionEvaluations: AgentResult[],
  overallScore: number,
  languageInstruction: string
): Promise<string> {
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
    
    return summaryResult.text;
  } catch (summaryError) {
    logDebug('Error generating overall summary:', summaryError);
    // Provide fallback summary if generation fails
    return `CV evaluated with overall score ${overallScore.toFixed(1)}/10. Review detailed feedback for specific improvement areas.`;
  }
}

/**
 * Extract strengths from evaluation results
 */
export function extractStrengths(criterionEvaluations: AgentResult[]): string[] {
  return criterionEvaluations
    .filter(criterion => criterion.score >= 7)
    .map(criterion => {
      const areaName = criterion.criterion_name.toLowerCase();
      return `Strong ${areaName} (scored ${criterion.score.toFixed(1)}/10)`;
    });
}

/**
 * Extract improvement areas from evaluation results
 */
export function extractImprovementAreas(criterionEvaluations: AgentResult[]): string[] {
  return criterionEvaluations
    .filter(criterion => criterion.score < 7)
    .sort((a, b) => a.score - b.score) // Sort by score ascending (worst first)
    .map(criterion => {
      const areaName = criterion.criterion_name.toLowerCase();
      return `Improve ${areaName} (scored ${criterion.score.toFixed(1)}/10)`;
    });
} 