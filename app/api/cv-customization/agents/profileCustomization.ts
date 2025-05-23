import { LanguageModelV1 } from 'ai';
import { generateObject } from 'ai';
import { customerRequirementsSchema, cvCustomizationSummarySchema } from '../schemas';

// Define a content item type
type ContentItem = {
  type: 'text' | 'file';
  text?: string;
  data?: Buffer;
  mimeType?: string;
  filename?: string;
};

interface ProfileCustomizationParams {
  model: LanguageModelV1;
  cvBuffer: Buffer;
  cvFileName: string;
  customerRequirements: any;
  languageInstruction?: string;
}

/**
 * Customizes the CV profile section based on customer requirements
 */
export async function runProfileCustomizationAgent({
  model,
  cvBuffer,
  cvFileName,
  customerRequirements,
  languageInstruction = ''
}: ProfileCustomizationParams) {
  
  // Create a list of requirements for the prompt
  const mustHaveRequirements = customerRequirements.must_have_requirements
    .map((req: any) => `- ${req.requirement}: ${req.description} (Priority: ${req.priority})`)
    .join('\n');
    
  const shouldHaveRequirements = customerRequirements.should_have_requirements
    .map((req: any) => `- ${req.requirement}: ${req.description} (Priority: ${req.priority})`)
    .join('\n');
  
  const systemPrompt = `
    You are an expert CV writer specializing in tailoring professional profiles to specific job requirements.
    Your task is to extract the complete original profile summary section and create a customized version that better matches customer requirements.
    
    ${languageInstruction}
    
    Follow these steps:
    1. EXTRACT THE COMPLETE ORIGINAL PROFILE: Find and extract the ENTIRE personal profile/summary section from the CV exactly as written - do not abbreviate, summarize, or modify it in any way
    2. Analyze the customer requirements to understand what should be emphasized
    3. CREATE A COMPREHENSIVE CUSTOMIZED VERSION: Write a new profile that:
       - Maintains substantial detail from the original profile
       - Emphasizes relevant skills and experiences that match customer requirements
       - Preserves important background information and specific details
       - Reorganizes content to highlight the most relevant aspects first
       - Should be comprehensive (similar length to original or slightly shorter, but NOT drastically shortened)
    4. Ensure the customized profile highlights how the candidate meets the must-have requirements
    5. Include relevant soft skills that would be valuable for the role
    6. Keep the professional tone and style consistent with the original
    7. Explain your reasoning for the changes
    
    CRITICAL INSTRUCTIONS:
    - original_profile: Must contain the COMPLETE, UNMODIFIED original profile text from the CV
    - customized_profile: Should be a comprehensive, tailored version that preserves important details while emphasizing relevance
    - reasoning: Explain what changes you made and why
    
    IMPORTANT: Do NOT create a short summary or drastically reduce the content. The customized profile should be substantial and detailed, just reorganized and emphasized differently to match the customer requirements. Only remove or de-emphasize content that is clearly irrelevant to the customer's needs.
  `;
  
  try {
    const messageContent: ContentItem[] = [
      {
        type: 'text',
        text: `Here are the customer requirements:
        
CONTEXT SUMMARY:
${customerRequirements.context_summary}

MUST-HAVE REQUIREMENTS:
${mustHaveRequirements}

SHOULD-HAVE REQUIREMENTS:
${shouldHaveRequirements}

INSTRUCTIONS:
1. Extract the COMPLETE original profile/summary section from the attached CV exactly as written (do not shorten or modify it)
2. Create a customized version that better aligns with these customer requirements
3. Provide detailed reasoning for your changes

CRITICAL: The original_profile field must contain the ENTIRE original profile summary text from the CV, word-for-word, without any modifications, abbreviations, or summarization.`
      },
      {
        type: 'file',
        data: cvBuffer,
        mimeType: 'application/pdf',
        filename: cvFileName
      }
    ];
    
    const { object: profileCustomization } = await generateObject({
      model,
      schema: cvCustomizationSummarySchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent as any
        }
      ]
    });
    
    return profileCustomization;
  } catch (error) {
    console.error('Error in profile customization:', error);
    throw new Error('Failed to customize CV profile');
  }
} 