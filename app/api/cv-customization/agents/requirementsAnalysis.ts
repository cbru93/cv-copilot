import { LanguageModelV1 } from 'ai';
import { generateObject } from 'ai';
import { customerRequirementsSchema } from '../schemas';

// Define a content item type
type ContentItem = {
  type: 'text' | 'file';
  text?: string;
  data?: Buffer;
  mimeType?: string;
  filename?: string;
};

interface RequirementsAnalysisParams {
  model: LanguageModelV1;
  customerDocsContent: ContentItem[];
  languageInstruction?: string;
}

/**
 * Analyzes customer requirements documents to extract key requirements
 */
export async function runRequirementsAnalysisAgent({
  model,
  customerDocsContent,
  languageInstruction = ''
}: RequirementsAnalysisParams) {
  
  const systemPrompt = `
    You are an expert CV analyst specializing in analyzing job requirements and customer specifications.
    Your task is to analyze the provided customer documents and extract all requirements.
    
    ${languageInstruction}
    
    Follow these steps:
    1. Identify all requirements in the customer documents
    2. Categorize them as "must have" (essential) or "should have" (desired but not essential)
    3. For each requirement, provide a brief description
    4. Assign a priority level (High, Medium, Low) to each requirement
    5. Provide a brief context summary of the customer and project
    
    Be thorough but concise. Focus on technical skills, domain knowledge, experience levels, 
    and any specific qualifications mentioned.
  `;
  
  try {
    const { object: requirements } = await generateObject({
      model,
      schema: customerRequirementsSchema,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: customerDocsContent as any
      }]
    });
    
    return requirements;
  } catch (error) {
    console.error('Error in requirements analysis:', error);
    throw new Error('Failed to analyze customer requirements');
  }
} 