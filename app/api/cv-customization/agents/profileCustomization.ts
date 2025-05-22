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
    Your task is to customize the personal profile section of a CV to better match customer requirements.
    
    ${languageInstruction}
    
    Follow these steps:
    1. Identify the personal profile/summary section from the CV
    2. Analyze the customer requirements
    3. Create a customized version of the profile that emphasizes relevant skills and experiences
    4. Ensure the customized profile highlights how the candidate meets the must-have requirements
    5. Include relevant soft skills that would be valuable for the role
    6. Keep the professional tone and style of the original profile
    7. Explain your reasoning for the changes
    
    The customized profile should be concise (typically 3-5 sentences) and impactful.
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

Please identify the personal profile/summary section from the attached CV and create a customized version 
that better aligns with these customer requirements. Provide the original profile, 
your customized version, and explain your reasoning for the changes.`
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