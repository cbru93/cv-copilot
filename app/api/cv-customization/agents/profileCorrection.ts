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

interface ProfileCorrectionParams {
  model: LanguageModelV1;
  cvBuffer: Buffer;
  cvFileName: string;
  originalProfile: string;
  customizedProfile: string;
  profileValidation: any;
  customerRequirements: any;
  languageInstruction?: string;
}

// Define the profile correction schema
const profileCorrectionSchema = z.object({
  corrected_profile: z.string(),
  changes_made: z.array(z.string()),
  preserved_customizations: z.array(z.string()),
  reasoning: z.string(),
  confidence_score: z.number().min(0).max(10)
});

/**
 * Corrects profile validation issues while preserving valid customizations
 */
export async function runProfileCorrectionAgent({
  model,
  cvBuffer,
  cvFileName,
  originalProfile,
  customizedProfile,
  profileValidation,
  customerRequirements,
  languageInstruction = ''
}: ProfileCorrectionParams): Promise<z.infer<typeof profileCorrectionSchema>> {
  
  const systemPrompt = `
    You are an expert CV profile correction specialist. Your task is to fix only the specific validation issues identified while preserving valuable customizations that are factually accurate.
    
    ${languageInstruction}
    
    CORRECTION PRINCIPLES:
    1. TARGETED FIXES: Only fix the specific fabricated or unsupported claims identified
    2. PRESERVE CUSTOMIZATIONS: Keep all valid customizations that improve relevance to customer requirements
    3. MAINTAIN OPTIMIZATION: The corrected profile should still be optimized for the customer requirements
    4. FACTUAL ACCURACY: Ensure all information is grounded in the original CV
    5. BALANCED APPROACH: Don't revert to the original - improve the customized version
    
    PROCESS:
    1. Identify the specific issues flagged in the validation
    2. Fix only those issues while keeping valid improvements
    3. Maintain the enhanced presentation and relevance to customer requirements
    4. Ensure the result is both factually accurate and well-optimized
  `;
  
  const validationIssues = `
VALIDATION ISSUES TO FIX:
- Factually Accurate: ${profileValidation.is_factually_accurate}
- Fabricated Claims: ${profileValidation.fabricated_claims.join(', ') || 'None'}
- Unsupported Claims: ${profileValidation.unsupported_claims.join(', ') || 'None'}
- Validation Reasoning: ${profileValidation.reasoning}
  `;
  
  const requirementsContext = `
CUSTOMER REQUIREMENTS TO MAINTAIN RELEVANCE:
${customerRequirements.must_have_requirements.map((req: any) => `- ${req.requirement} (${req.category})`).join('\n')}
${customerRequirements.should_have_requirements.map((req: any) => `- ${req.requirement} (${req.category})`).join('\n')}
  `;
  
  try {
    const messageContent: ContentItem[] = [
      {
        type: 'text',
        text: `Please correct the specific validation issues in the customized profile while preserving valid customizations.

${validationIssues}

${requirementsContext}

ORIGINAL PROFILE:
${originalProfile}

CUSTOMIZED PROFILE (to be corrected):
${customizedProfile}

INSTRUCTIONS:
1. Fix only the specific fabricated or unsupported claims identified
2. Preserve all valid customizations that improve relevance to customer requirements
3. Maintain the enhanced presentation style from the customized version
4. Ensure the result is both factually accurate and optimized for customer needs
5. Do NOT simply revert to the original profile

The corrected profile should be an improved version of the customized profile with validation issues fixed.`
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
      schema: profileCorrectionSchema,
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
    console.error('Error in profile correction:', error);
    throw new Error('Failed to correct profile content');
  }
} 