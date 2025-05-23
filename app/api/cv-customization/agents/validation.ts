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
    6. QUOTE EXACTLY: When identifying fabricated or unsupported claims, provide the EXACT text from the customized content
    7. DISTINGUISH REORGANIZATION FROM FABRICATION: Reorganizing or rephrasing existing information is acceptable; adding new information is not
    
    CRITICAL VALIDATION PROCESS:
    For each customized section:
    1. Read through the ENTIRE original CV document to establish the factual baseline
    2. Compare the customized content word-by-word with ALL content in the original CV
    3. Only flag as fabricated/unsupported if the information is definitively NOT present in the original CV
    4. Allow reasonable interpretation and rephrasing of existing information
    5. Distinguish between reorganization/emphasis changes vs. actual fabrication
    6. Focus on substance, not style or presentation changes
    
    WHEN IDENTIFYING ISSUES:
    - Quote the EXACT text from the customized content that is problematic
    - Be specific about which words or phrases are not supported by the original CV
    - Explain WHY you consider something fabricated (what specific information is missing from the original)
    - Do not flag reasonable interpretations or enhanced presentation of existing information
    - Do not flag reorganization or rephrasing unless new facts are added
    
    OUTPUT REQUIREMENTS:
    - corrected_profile: Only provide if corrections are needed, otherwise use empty string ""
    - corrected_description: Only provide if corrections are needed, otherwise use empty string ""
    - When corrections are provided, they should maintain the customization intent while ensuring factual accuracy
    - If no fabricated content is found, clearly state this in your reasoning
    
    IMPORTANT: Be extremely careful to distinguish between:
    - ACCEPTABLE: Reorganizing, rephrasing, or emphasizing existing information from the CV
    - UNACCEPTABLE: Adding new information, skills, experiences, or claims not present in the original CV
    
    Your validation should be thorough but fair - don't penalize good customization that stays within factual bounds.
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

VALIDATION INSTRUCTIONS:
1. Read through the ENTIRE attached CV document to understand all available information
2. Compare each piece of customized content against the complete original CV
3. Focus on identifying genuinely fabricated information (not just reorganized or rephrased content)
4. Remember that the original profile provided above may be extracted/parsed, so check against the full PDF document
5. Only flag content as fabricated if you cannot find supporting information anywhere in the original CV
6. Distinguish between:
   - ACCEPTABLE: Reorganizing, emphasizing, or rephrasing existing information
   - UNACCEPTABLE: Adding completely new information not present in the original

Please analyze each section and identify:
1. Any genuinely fabricated information not present anywhere in the original CV document
2. Any claims that significantly exaggerate beyond what's supported in the original
3. Any technologies, skills, or experiences completely absent from the original CV
4. Provide corrected versions only if actual fabrication is found

Be thorough but fair - good customization that reorganizes existing information should not be penalized.`
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