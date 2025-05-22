import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { ratingSchema } from '../schemas';
import { logDebug } from '../utils';

export interface LanguageQualityAgentInput {
  model: LanguageModel;
  fileBuffer: Buffer;
  fileName: string;
  languageInstruction: string;
}

/**
 * Language Quality Agent - evaluates grammar, spelling, tone, and writing style
 */
export async function runLanguageQualityAgent({
  model,
  fileBuffer,
  fileName,
  languageInstruction,
}: LanguageQualityAgentInput) {
  try {
    const result = await generateObject({
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
            filename: fileName,
          }
        ],
      }]
    });

    return {
      ...result.object,
      criterion_id: 'language_quality',
      criterion_name: 'Language Quality'
    };
  } catch (e) {
    logDebug('Error in language quality evaluation:', e);
    throw new Error(`Language quality agent failed: ${e instanceof Error ? e.message : String(e)}`);
  }
} 