import { LanguageModelV1 } from 'ai';
import { generateObject } from 'ai';
import { z } from 'zod';

// Define a content item type
type ContentItem = {
  type: 'text' | 'file';
  text?: string;
  data?: Buffer;
  mimeType?: string;
  filename?: string;
};

interface CompetenciesCorrectionParams {
  model: LanguageModelV1;
  cvBuffer: Buffer;
  cvFileName: string;
  originalCompetencies: string[];
  customizedCompetencies: string[];
  competenciesValidation: any;
  customerRequirements: any;
  languageInstruction?: string;
}

// Define the competencies correction schema
const competenciesCorrectionSchema = z.object({
  corrected_competencies: z.array(z.string()),
  removed_competencies: z.array(z.string()),
  preserved_competencies: z.array(z.string()),
  reasoning: z.string(),
  confidence_score: z.number().min(0).max(10)
});

/**
 * Corrects competencies validation issues while preserving valid selections
 */
export async function runCompetenciesCorrectionAgent({
  model,
  cvBuffer,
  cvFileName,
  originalCompetencies,
  customizedCompetencies,
  competenciesValidation,
  customerRequirements,
  languageInstruction = ''
}: CompetenciesCorrectionParams): Promise<z.infer<typeof competenciesCorrectionSchema>> {
  
  const systemPrompt = `
    You are an expert CV competencies correction specialist. Your task is to fix competency validation issues while preserving relevant selections.
    
    ${languageInstruction}
    
    CORRECTION PRINCIPLES:
    1. REMOVE FABRICATED: Remove only competencies that are not supported by the original CV
    2. PRESERVE RELEVANT: Keep all competencies that are both in the original CV and relevant to customer requirements
    3. MAINTAIN OPTIMIZATION: Ensure the final list is still optimized for customer requirements
    4. FACTUAL GROUNDING: Only include competencies that are clearly demonstrated in the original CV
  `;
  
  const validationIssues = `
VALIDATION ISSUES TO FIX:
- Unsupported Competencies: ${competenciesValidation.unsupported_competencies.join(', ') || 'None'}
- Validation Reasoning: ${competenciesValidation.reasoning}
  `;
  
  const requirementsContext = `
CUSTOMER REQUIREMENTS:
${customerRequirements.must_have_requirements.map((req: any) => `- ${req.requirement} (${req.category})`).join('\n')}
${customerRequirements.should_have_requirements.map((req: any) => `- ${req.requirement} (${req.category})`).join('\n')}
  `;
  
  try {
    const messageContent: ContentItem[] = [
      {
        type: 'text',
        text: `Please correct the competencies list by removing only the unsupported ones while preserving valid selections.

${validationIssues}

${requirementsContext}

ORIGINAL COMPETENCIES (available in CV):
${originalCompetencies.map(comp => `- ${comp}`).join('\n')}

CURRENT CUSTOMIZED COMPETENCIES (to be corrected):
${customizedCompetencies.map(comp => `- ${comp}`).join('\n')}

INSTRUCTIONS:
1. Remove only the competencies identified as unsupported by the validation
2. Keep all competencies that are both in the original CV and relevant to customer requirements
3. Ensure the final list is well-optimized for the customer requirements
4. Maintain a good balance of relevant competencies`
      },
      {
        type: 'file',
        data: cvBuffer,
        mimeType: 'application/pdf',
        filename: cvFileName
      }
    ];
    
    const { object: correction } = await generateObject({
      model,
      schema: competenciesCorrectionSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent as any
        }
      ]
    });
    
    return correction;
  } catch (error) {
    console.error('Error in competencies correction:', error);
    throw new Error('Failed to correct competencies content');
  }
} 