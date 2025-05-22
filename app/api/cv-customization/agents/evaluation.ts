import { LanguageModelV1 } from 'ai';
import { generateObject } from 'ai';
import { z } from 'zod';

interface EvaluationParams {
  model: LanguageModelV1;
  customizedProfile: any;
  keyCompetencies: any;
  customizedProjects: any[];
  customerRequirements: any;
  languageInstruction?: string;
}

// Define the evaluation schema
const evaluationSchema = z.object({
  requirement_coverage: z.array(
    z.object({
      requirement: z.string(),
      covered: z.boolean(),
      coverage_details: z.string(),
      improvement_suggestions: z.string()
    })
  ),
  overall_score: z.number().min(0).max(10),
  overall_comments: z.string(),
  improvement_suggestions: z.array(z.string())
});

/**
 * Evaluates the customized CV against customer requirements
 */
export async function runEvaluationAgent({
  model,
  customizedProfile,
  keyCompetencies,
  customizedProjects,
  customerRequirements,
  languageInstruction = ''
}: EvaluationParams) {
  
  // Create a list of requirements for the prompt
  const allRequirements = [
    ...customerRequirements.must_have_requirements.map((req: any) => 
      `- ${req.requirement}: ${req.description} (Must-have, Priority: ${req.priority})`
    ),
    ...customerRequirements.should_have_requirements.map((req: any) => 
      `- ${req.requirement}: ${req.description} (Should-have, Priority: ${req.priority})`
    )
  ].join('\n');
  
  // Format customized projects
  const projectsSummary = customizedProjects.map(project => `
    PROJECT: ${project.project_name}
    RELEVANCE SCORE: ${project.relevance_score}/10
    CUSTOMIZED DESCRIPTION:
    ${project.customized_description}
    
    PARC ANALYSIS:
    - Problem: ${project.parc_analysis.problem}
    - Accountability: ${project.parc_analysis.accountability}
    - Role: ${project.parc_analysis.role}
    - Result: ${project.parc_analysis.result}
  `).join('\n\n');
  
  const systemPrompt = `
    You are an expert CV evaluator specializing in assessing how well a CV meets specific job requirements.
    Your task is to evaluate the customized CV against the customer requirements.
    
    ${languageInstruction}
    
    Follow these steps:
    1. Assess how well each customer requirement is covered in the customized CV
    2. For each requirement, provide details on where and how it is covered
    3. Suggest improvements for requirements that are not well covered
    4. Provide an overall score (0-10) for how well the CV matches the requirements
    5. Provide overall comments and improvement suggestions
    
    Be thorough but fair in your assessment. Focus on concrete evidence in the CV.
  `;
  
  try {
    const { object: evaluation } = await generateObject({
      model,
      schema: evaluationSchema,
      system: systemPrompt,
      prompt: `
        Please evaluate the following customized CV against the customer requirements:
        
        CUSTOMER REQUIREMENTS:
        ${allRequirements}
        
        CUSTOMIZED PROFILE:
        ${customizedProfile.customized_profile}
        
        KEY COMPETENCIES:
        ${keyCompetencies.relevant_competencies.map((comp: string) => `- ${comp}`).join('\n')}
        
        CUSTOMIZED PROJECTS:
        ${projectsSummary}
        
        For each requirement, evaluate if it is covered in the CV, provide details on the coverage,
        and suggest improvements if needed. Then provide an overall score and comments.
      `
    });
    
    return evaluation;
  } catch (error) {
    console.error('Error in CV evaluation:', error);
    throw new Error('Failed to evaluate customized CV');
  }
} 