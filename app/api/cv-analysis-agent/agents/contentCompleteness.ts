import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { contentCompletenessSchema } from '../schemas';
import { logDebug } from '../utils';

export interface ContentCompletenessAgentInput {
  model: LanguageModel;
  fileBuffer: Buffer;
  fileName: string;
  languageInstruction: string;
}

/**
 * Content Completeness Agent - checks if the CV contains all standard elements
 */
export async function runContentCompletenessAgent({
  model,
  fileBuffer,
  fileName,
  languageInstruction,
}: ContentCompletenessAgentInput) {
  try {
    const result = await generateObject({
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
            filename: fileName,
          }
        ],
      }]
    });

    return {
      ...result.object,
      criterion_id: 'content_completeness',
      criterion_name: 'Content Completeness'
    };
  } catch (e) {
    logDebug('Error in content completeness evaluation:', e);
    throw new Error(`Content completeness agent failed: ${e instanceof Error ? e.message : String(e)}`);
  }
} 