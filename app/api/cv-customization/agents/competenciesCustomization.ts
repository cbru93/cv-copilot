import { LanguageModelV1 } from 'ai';
import { generateObject } from 'ai';
import { keyCompetenciesSchema } from '../schemas';

// Define a content item type
type ContentItem = {
  type: 'text' | 'file';
  text?: string;
  data?: Buffer;
  mimeType?: string;
  filename?: string;
};

interface CompetenciesCustomizationParams {
  model: LanguageModelV1;
  cvBuffer: Buffer;
  cvFileName: string;
  customerRequirements: any;
  languageInstruction?: string;
}

/**
 * Customizes the competencies section based on customer requirements
 */
export async function runCompetenciesCustomizationAgent({
  model,
  cvBuffer,
  cvFileName,
  customerRequirements,
  languageInstruction = ''
}: CompetenciesCustomizationParams) {
  
  // Create a list of requirements for the prompt
  const allRequirements = [
    ...customerRequirements.must_have_requirements.map((req: any) => 
      `- ${req.requirement} (Must-have, Priority: ${req.priority})`
    ),
    ...customerRequirements.should_have_requirements.map((req: any) => 
      `- ${req.requirement} (Should-have, Priority: ${req.priority})`
    )
  ].join('\n');
  
  const systemPrompt = `
    You are an expert CV consultant specializing in tailoring professional competencies to match job requirements.
    Your task is to identify and prioritize competencies in a CV based on customer requirements.
    
    ${languageInstruction}
    
    Follow these steps:
    1. Extract all competencies/skills mentioned in the CV
    2. Identify which of these competencies are most relevant to the customer requirements
    3. Suggest additional competencies that should be highlighted based on the CV content and requirements
    4. Provide reasoning for your selections
    
    Focus on both technical skills and domain knowledge that align with the customer's needs.
  `;
  
  try {
    const messageContent: ContentItem[] = [
      {
        type: 'text',
        text: `Here are the customer requirements:
        
CONTEXT SUMMARY:
${customerRequirements.context_summary}

REQUIREMENTS:
${allRequirements}

Please analyze the attached CV. Extract all competencies from it, identify which ones are most relevant to the 
customer requirements, and suggest any additional competencies that should be highlighted 
based on the CV content. Provide your reasoning for the selections.`
      },
      {
        type: 'file',
        data: cvBuffer,
        mimeType: 'application/pdf',
        filename: cvFileName
      }
    ];
    
    const { object: competenciesCustomization } = await generateObject({
      model,
      schema: keyCompetenciesSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent as any
        }
      ]
    });
    
    return competenciesCustomization;
  } catch (error) {
    console.error('Error in competencies customization:', error);
    throw new Error('Failed to customize competencies');
  }
} 