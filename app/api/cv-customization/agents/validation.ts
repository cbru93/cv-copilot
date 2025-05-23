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

interface ValidationParams {
  model: LanguageModelV1;
  cvBuffer: Buffer;
  cvFileName: string;
  originalProfile: string;
  customizedProfile: string;
  originalCompetencies: string[];
  customizedCompetencies: string[];
  customizedProjects: any[];
  languageInstruction?: string;
}

// Define the validation schema
const validationSchema = z.object({
  profile_validation: z.object({
    is_factually_accurate: z.boolean(),
    fabricated_claims: z.array(z.string()),
    unsupported_claims: z.array(z.string()),
    reasoning: z.string(),
    corrected_profile: z.string()
  }),
  competencies_validation: z.object({
    unsupported_competencies: z.array(z.string()),
    reasoning: z.string()
  }),
  projects_validation: z.array(z.object({
    project_name: z.string(),
    is_factually_accurate: z.boolean(),
    fabricated_details: z.array(z.string()),
    unsupported_claims: z.array(z.string()),
    reasoning: z.string(),
    corrected_description: z.string()
  })),
  overall_validation: z.object({
    passes_validation: z.boolean(),
    confidence_score: z.number().min(0).max(10),
    summary: z.string(),
    recommendations: z.array(z.string())
  })
});

/**
 * Validates that customized CV content is grounded in the original CV and doesn't contain fabricated information
 */
export async function runValidationAgent({
  model,
  cvBuffer,
  cvFileName,
  originalProfile,
  customizedProfile,
  originalCompetencies,
  customizedCompetencies,
  customizedProjects,
  languageInstruction = ''
}: ValidationParams): Promise<z.infer<typeof validationSchema>> {
  
  const systemPrompt = `
    You are an expert fact-checker specializing in CV content validation.
    Your critical task is to ensure that all customized CV content is FACTUALLY ACCURATE and GROUNDED in the original CV.
    
    ${languageInstruction}
    
    STRICT VALIDATION RULES:
    1. NO FABRICATION: Never allow any information that is not present or directly supported by the original CV
    2. NO EXAGGERATION: Don't allow overstated claims about skills, experience, or achievements
    3. NO INVENTION: Don't allow new technologies, projects, or experiences not mentioned in the original CV
    4. VERIFY EVERYTHING: Cross-check every claim in the customized content against the original CV
    5. BE CONSERVATIVE: When in doubt, flag as potentially fabricated
    
    For each customized section, you must:
    1. Compare it word-by-word with the original CV content
    2. Identify any claims not supported by the original CV
    3. Flag any exaggerations or embellishments
    4. Provide corrections that stay true to the original CV while still being relevant
    5. Rate your confidence in the validation (0-10 scale)
    
    IMPORTANT OUTPUT REQUIREMENTS:
    - Always provide corrected_profile field: if no correction is needed, provide an empty string ""
    - Always provide corrected_description field for each project: if no correction is needed, provide an empty string ""
    - If corrections are needed, provide the improved version that stays factual to the original CV
    
    Remember: It's better to be too conservative than to allow fabricated content.
  `;
  
  // Format the customized projects for analysis
  const projectsText = customizedProjects.map(project => `
    PROJECT: ${project.project_name}
    ORIGINAL DESCRIPTION: ${project.original_description}
    CUSTOMIZED DESCRIPTION: ${project.customized_description}
    PARC ANALYSIS:
    - Problem: ${project.parc_analysis.problem}
    - Accountability: ${project.parc_analysis.accountability}
    - Role: ${project.parc_analysis.role}
    - Result: ${project.parc_analysis.result}
  `).join('\n\n');
  
  try {
    const messageContent: ContentItem[] = [
      {
        type: 'text',
        text: `Please validate the following customized CV content against the original CV to ensure no fabrication or unsupported claims:

ORIGINAL PROFILE:
${originalProfile}

CUSTOMIZED PROFILE:
${customizedProfile}

ORIGINAL COMPETENCIES:
${originalCompetencies.map(comp => `- ${comp}`).join('\n')}

RELEVANT CUSTOMIZED COMPETENCIES:
${customizedCompetencies.map(comp => `- ${comp}`).join('\n')}

CUSTOMIZED PROJECTS:
${projectsText}

Please analyze each section and identify:
1. Any fabricated information not present in the original CV
2. Any unsupported claims or exaggerations
3. Any technologies, skills, or experiences not mentioned in the original CV
4. Provide corrected versions that stay true to the original CV while maintaining relevance

Be extremely thorough and conservative in your validation.`
      },
      {
        type: 'file',
        data: cvBuffer,
        mimeType: 'application/pdf',
        filename: cvFileName
      }
    ];
    
    const { object: validation } = await generateObject({
      model,
      schema: validationSchema,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent as any
        }
      ]
    });
    
    return validation;
  } catch (error) {
    console.error('Error in CV validation:', error);
    throw new Error('Failed to validate customized CV content');
  }
} 