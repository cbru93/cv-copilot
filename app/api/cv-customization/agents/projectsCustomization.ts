import { LanguageModelV1 } from 'ai';
import { generateObject } from 'ai';
import { projectCustomizationSchema } from '../schemas';
import { z } from 'zod';

// Define a content item type
type ContentItem = {
  type: 'text' | 'file';
  text?: string;
  data?: Buffer;
  mimeType?: string;
  filename?: string;
};

interface ProjectsCustomizationParams {
  model: LanguageModelV1;
  cvBuffer: Buffer;
  cvFileName: string;
  customerRequirements: any;
  languageInstruction?: string;
}

/**
 * Customizes project descriptions based on customer requirements
 */
export async function runProjectsCustomizationAgent({
  model,
  cvBuffer,
  cvFileName,
  customerRequirements,
  languageInstruction = ''
}: ProjectsCustomizationParams) {
  
  // Create a list of requirements for the prompt
  const allRequirements = [
    ...customerRequirements.must_have_requirements.map((req: any) => 
      `- ${req.requirement}: ${req.description} (Must-have, Priority: ${req.priority})`
    ),
    ...customerRequirements.should_have_requirements.map((req: any) => 
      `- ${req.requirement}: ${req.description} (Should-have, Priority: ${req.priority})`
    )
  ].join('\n');
  
  const systemPrompt = `
    You are an expert CV consultant specializing in tailoring project descriptions to match job requirements.
    Your task is to extract projects from the CV and customize their descriptions to highlight experiences relevant to the customer requirements.
    
    ${languageInstruction}
    
    Follow these steps:
    1. Identify key projects/assignments from the CV
    2. For each identified project, extract its original description
    3. Customize each project description to highlight aspects relevant to the customer requirements
    
    Follow the PARC method for project descriptions:
    - Problem: What was the challenge or situation?
    - Accountability: What responsibilities did the consultant have?
    - Role: What was the consultant's specific role?
    - Result: What outcomes were achieved?
    
    When customizing project descriptions:
    1. Highlight aspects that align with customer requirements
    2. Use action-oriented language
    3. Quantify achievements when possible
    4. Focus on the consultant's personal contribution
    5. Ensure the customized description accurately reflects the original project
    6. Provide a relevance score (0-10) for each project based on how well it matches the requirements
    
    For each project, provide:
    - Project name
    - Original description
    - Customized description using PARC method
    - Relevance score
    - Reasoning for customization
    
    Return at least 3-5 most relevant projects. Sort them by relevance to the customer requirements.
  `;
  
  try {
    const messageContent: ContentItem[] = [
      {
        type: 'text',
        text: `Please analyze the attached CV and extract key projects. Then customize each project description to better match these customer requirements:
        
CONTEXT SUMMARY:
${customerRequirements.context_summary}

REQUIREMENTS:
${allRequirements}

For each project:
1. Extract the original description
2. Create a customized version that highlights aspects relevant to the requirements
3. Use the PARC method (Problem, Accountability, Role, Result)
4. Rate the relevance of each project to the requirements (0-10)
5. Provide reasoning for your customization

Return the projects sorted by relevance score (highest first).`
      },
      {
        type: 'file',
        data: cvBuffer,
        mimeType: 'application/pdf',
        filename: cvFileName
      }
    ];
    
    // Process projects - with a wrapper object schema to satisfy OpenAI's requirement
    const projectsResponseSchema = z.object({
      projects: z.array(projectCustomizationSchema)
    });
    
    const { object: projectsResponse } = await generateObject({
      model,
      schema: projectsResponseSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent as any
        }
      ]
    });
    
    // Extract the projects array from the response
    const customizedProjects = projectsResponse.projects;
    
    // Sort projects by relevance score (descending)
    return customizedProjects.sort((a, b) => b.relevance_score - a.relevance_score);
  } catch (error) {
    console.error('Error in projects customization:', error);
    throw new Error('Failed to customize project descriptions');
  }
} 