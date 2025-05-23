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

interface ProjectsCorrectionParams {
  model: LanguageModelV1;
  cvBuffer: Buffer;
  cvFileName: string;
  customizedProjects: any[];
  projectsValidation: any[];
  customerRequirements: any;
  languageInstruction?: string;
}

// Define the projects correction schema
const projectsCorrectionSchema = z.object({
  corrected_projects: z.array(z.object({
    project_name: z.string(),
    corrected_description: z.string(),
    parc_analysis: z.object({
      problem: z.string(),
      accountability: z.string(),
      role: z.string(),
      result: z.string()
    }),
    changes_made: z.array(z.string()),
    preserved_elements: z.array(z.string()),
    reasoning: z.string()
  })),
  correction_summary: z.object({
    total_projects_corrected: z.number(),
    major_corrections: z.array(z.string()),
    confidence_score: z.number().min(0).max(10)
  })
});

/**
 * Corrects project validation issues while preserving valid customizations
 */
export async function runProjectsCorrectionAgent({
  model,
  cvBuffer,
  cvFileName,
  customizedProjects,
  projectsValidation,
  customerRequirements,
  languageInstruction = ''
}: ProjectsCorrectionParams): Promise<z.infer<typeof projectsCorrectionSchema>> {
  
  const systemPrompt = `
    You are an expert CV projects correction specialist. Your task is to fix project validation issues while preserving valuable customizations.
    
    ${languageInstruction}
    
    CORRECTION PRINCIPLES:
    1. TARGETED FIXES: Only fix the specific fabricated or unsupported claims identified
    2. PRESERVE CUSTOMIZATIONS: Keep all valid improvements in presentation and relevance
    3. MAINTAIN PARC STRUCTURE: Preserve the Problem-Accountability-Role-Result analysis where factual
    4. FACTUAL GROUNDING: Ensure all details are supported by the original CV
    5. OPTIMIZE FOR REQUIREMENTS: Keep customizations that improve relevance to customer requirements
    
    IMPORTANT: You must return corrections for ALL ${customizedProjects.length} projects, not just some of them.
  `;
  
  const requirementsContext = `
CUSTOMER REQUIREMENTS:
${customerRequirements.must_have_requirements.map((req: any) => `- ${req.requirement} (${req.category})`).join('\n')}
${customerRequirements.should_have_requirements.map((req: any) => `- ${req.requirement} (${req.category})`).join('\n')}
  `;
  
  const projectsWithValidation = customizedProjects.map((project, index) => {
    const validation = projectsValidation.find(v => v.project_name === project.project_name) || projectsValidation[index];
    return {
      ...project,
      validation: validation || {
        is_factually_accurate: true,
        fabricated_details: [],
        unsupported_claims: [],
        reasoning: 'No validation issues found'
      }
    };
  });
  
  const projectsText = projectsWithValidation.map((project, index) => `
PROJECT ${index + 1}: ${project.project_name}
ORIGINAL DESCRIPTION: ${project.original_description}
CUSTOMIZED DESCRIPTION: ${project.customized_description}
PARC ANALYSIS:
- Problem: ${project.parc_analysis.problem}
- Accountability: ${project.parc_analysis.accountability}
- Role: ${project.parc_analysis.role}
- Result: ${project.parc_analysis.result}

VALIDATION ISSUES:
- Factually Accurate: ${project.validation.is_factually_accurate}
- Fabricated Details: ${project.validation.fabricated_details.join(', ') || 'None'}
- Unsupported Claims: ${project.validation.unsupported_claims.join(', ') || 'None'}
- Reasoning: ${project.validation.reasoning}
  `).join('\n\n');
  
  try {
    const messageContent: ContentItem[] = [
      {
        type: 'text',
        text: `Please correct validation issues in ALL ${customizedProjects.length} project descriptions while preserving valid customizations.

${requirementsContext}

PROJECTS TO CORRECT:
${projectsText}

INSTRUCTIONS:
1. Provide corrections for ALL ${customizedProjects.length} projects in the same order
2. Fix only the specific fabricated or unsupported claims identified for each project
3. Preserve all valid customizations that improve relevance to customer requirements
4. Maintain the enhanced presentation style and PARC structure where factual
5. Ensure each corrected description is grounded in the original project description
6. Keep customizations that legitimately improve alignment with customer requirements

Each corrected project should be an improved version of the customized project with validation issues fixed.`
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
      schema: projectsCorrectionSchema,
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
    console.error('Error in projects correction:', error);
    throw new Error('Failed to correct projects content');
  }
} 