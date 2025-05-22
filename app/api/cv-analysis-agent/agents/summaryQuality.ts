import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { summaryEvaluationSchema } from '../schemas';
import { logDebug } from '../utils';

export interface SummaryQualityAgentInput {
  model: LanguageModel;
  fileBuffer: Buffer;
  fileName: string;
  languageInstruction: string;
  summaryChecklistText: string;
}

/**
 * Summary Quality Agent - evaluates the CV's summary/profile section
 */
export async function runSummaryQualityAgent({
  model,
  fileBuffer,
  fileName,
  languageInstruction,
  summaryChecklistText,
}: SummaryQualityAgentInput) {
  try {
    const result = await generateObject({
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
        
        First, extract and include the exact original summary text from the CV.
        Then, provide detailed reasoning for your rating, specific suggestions for improvement,
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
            filename: fileName,
          }
        ],
      }]
    });

    return {
      ...result.object,
      criterion_id: 'summary_quality',
      criterion_name: 'Summary Quality'
    };
  } catch (e) {
    logDebug('Error in summary quality evaluation:', e);
    throw new Error(`Summary quality agent failed: ${e instanceof Error ? e.message : String(e)}`);
  }
} 