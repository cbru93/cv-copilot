import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { projectDescriptionsSchema } from '../schemas';
import { logDebug } from '../utils';

export interface ProjectDescriptionsAgentInput {
  model: LanguageModel;
  fileBuffer: Buffer;
  fileName: string;
  languageInstruction: string;
  assignmentsChecklistText: string;
}

/**
 * Project Descriptions Agent - evaluates the quality of project/experience descriptions
 */
export async function runProjectDescriptionsAgent({
  model,
  fileBuffer,
  fileName,
  languageInstruction,
  assignmentsChecklistText,
}: ProjectDescriptionsAgentInput) {
  try {
    const result = await generateObject({
      model,
      schema: projectDescriptionsSchema,
      system: `You are an expert CV project descriptions evaluator.
        Analyze each project/experience description based on these criteria:
        - Proper structure with clear beginning and end
        - Action-oriented language focusing on deliverables, impact, and results
        - Clear indication of responsibility and role
        - Demonstration of value contribution
        - Following the PARK methodology:
          * Problem statement
          * Areas of responsibility
          * Results achieved
          * Knowledge/competencies utilized
        
        Rate each project on a scale from 0-10 where:
        0-3: Poor description lacking most elements
        4-6: Average description with some strengths but room for improvement
        7-10: Good to excellent description that effectively showcases the experience
        
        Be nuanced in your scoring, using the full range from 0-10 rather than just a few discrete values.
        For example, use scores like 3.5, 5.7, 8.2 to precisely reflect the quality level.
        
        Provide an overall rating, detailed reasoning, specific suggestions for improvement,
        and individual evaluations for each project including strengths and weaknesses.
        For the most problematic project descriptions, provide improved versions.
        
        Use these guidelines for project description evaluation:
        ${assignmentsChecklistText}
        
        ${languageInstruction}`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Please evaluate all project/experience descriptions in this CV. Analyze their structure, language, and effectiveness.`,
          },
          {
            type: 'file',
            data: fileBuffer,
            mimeType: 'application/pdf',
            filename: fileName,
          }
        ],
      }]
    });

    return {
      ...result.object,
      criterion_id: 'project_descriptions',
      criterion_name: 'Project Descriptions'
    };
  } catch (e) {
    logDebug('Error in project descriptions evaluation:', e);
    throw new Error(`Project descriptions agent failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Fix project descriptions score by calculating the average from individual project evaluations
 */
export function fixProjectDescriptionsScore(projectDescriptionsResult: any) {
  if (projectDescriptionsResult.score === 0 && 
      Array.isArray(projectDescriptionsResult.project_evaluations) && 
      projectDescriptionsResult.project_evaluations.length > 0) {
    // Calculate average score from individual project evaluations
    const avgProjectScore = projectDescriptionsResult.project_evaluations.reduce(
      (sum: number, project: any) => sum + project.score, 0
    ) / projectDescriptionsResult.project_evaluations.length;
    
    // Update the score
    return {
      ...projectDescriptionsResult,
      score: parseFloat(avgProjectScore.toFixed(1))
    };
  }
  
  return projectDescriptionsResult;
} 