import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { competenceVerificationSchema } from '../schemas';
import { logDebug } from '../utils';

export interface CompetenceVerificationAgentInput {
  model: LanguageModel;
  fileBuffer: Buffer;
  fileName: string;
  languageInstruction: string;
}

/**
 * Competence Verification Agent - verifies consistency between listed competencies/roles and project descriptions
 */
export async function runCompetenceVerificationAgent({
  model,
  fileBuffer,
  fileName,
  languageInstruction,
}: CompetenceVerificationAgentInput) {
  try {
    const result = await generateObject({
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
            filename: fileName,
          }
        ],
      }]
    });

    return {
      ...result.object,
      criterion_id: 'competence_verification',
      criterion_name: 'Competence Verification'
    };
  } catch (e) {
    logDebug('Error in competence verification:', e);
    throw new Error(`Competence verification agent failed: ${e instanceof Error ? e.message : String(e)}`);
  }
} 