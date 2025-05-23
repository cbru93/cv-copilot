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
    1. TARGETED FIXES: Only fix the specific fabricated or unsupported claims identified with exact quotes
    2. PRESERVE CUSTOMIZATIONS: Keep all valid improvements in presentation and relevance
    3. MAINTAIN NATURAL NARRATIVE: Preserve the flowing, natural language style that incorporates PARC principles seamlessly
    4. FACTUAL GROUNDING: Ensure all details are supported by the original CV
    5. OPTIMIZE FOR REQUIREMENTS: Keep customizations that improve relevance to customer requirements
    6. PRECISE CHANGES: Be specific about what text you change and why
    
    CRITICAL CORRECTION PROCESS:
    - ONLY make changes if specific fabricated text is identified in the validation
    - If validation provides exact quotes of fabricated claims, remove or modify only those specific quotes
    - If no specific fabricated text is identified, DO NOT change the description
    - When you make changes, be explicit about what text was removed/modified
    - Preserve all other customizations that improve relevance to customer requirements
    
    CRITICAL WRITING STYLE: Maintain natural, flowing narrative descriptions that seamlessly incorporate PARC elements:
    - Write corrected descriptions as compelling narrative paragraphs, not lists or bullet points
    - Naturally weave together context/challenges (Problem), responsibilities (Accountability), role (Role), and MEASURABLE outcomes (Result)
    - The description should read like a professional story flowing from situation to action to quantifiable results
    - Use third-person objective form and action-oriented language
    - Keep descriptions between 75-150 words as single, flowing paragraphs
    
    SPECIAL EMPHASIS ON MEASURABLE RESULTS:
    When preserving or correcting the Result component, prioritize quantifiable outcomes:
    - Performance improvements (percentages, speed, efficiency gains)
    - Cost savings or revenue impact (monetary amounts, budget reductions)
    - Time improvements (delivery timelines, process speed-ups)
    - Quality metrics (error reduction, compliance rates, customer satisfaction)
    - Scale achievements (number of users, systems, team size managed)
    - Business impact (market share, customer acquisition, retention rates)
    - Technical metrics (uptime, processing capacity, system performance)
    
    Preserve measurable results from the original CV while ensuring they are factually accurate.
    
    Example corrected style: "Managed the implementation of a customer relationship management system to address data fragmentation issues across multiple departments. Coordinated requirements gathering with stakeholders and oversaw the technical integration process across five business units. Successfully delivered the solution within the 6-month timeline, resulting in 40% improved data consistency and enhanced customer service capabilities that reduced response times by 25%."
    
    IMPORTANT: You must return corrections for ALL ${customizedProjects.length} projects, not just some of them. If no corrections are needed for a project, return the original customized description unchanged.
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
2. ONLY fix specific fabricated or unsupported claims that are identified with exact quotes in the validation
3. If validation does not provide exact quotes of problematic text, DO NOT change the description
4. Preserve all valid customizations that improve relevance to customer requirements
5. Maintain the natural narrative style - write corrected descriptions as flowing paragraphs that seamlessly incorporate PARC elements
6. Ensure each corrected description is grounded in the original project description
7. Keep customizations that legitimately improve alignment with customer requirements
8. Write in third-person objective form with action-oriented language
9. Keep corrected descriptions between 75-150 words as single, flowing paragraphs
10. In the changes_made field, be specific about what exact text was removed or modified
11. PRIORITIZE maintaining measurable results and quantifiable outcomes in the Result component of PARC

CRITICAL: If a project has no specific fabricated text identified with exact quotes, return the customized description unchanged and list "No changes needed" in changes_made.

Each corrected project should be an improved version of the customized project with validation issues fixed while maintaining professional narrative flow.
`
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