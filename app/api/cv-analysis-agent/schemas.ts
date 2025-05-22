import { z } from 'zod';

/**
 * Specialized evaluation criteria based on CV hjelper MVP
 */
export const evaluationCriteria = [
  {
    id: 'language_quality',
    name: 'Language Quality',
    description: 'Evaluate grammar, spelling, flow, and professional tone. Check if it uses third-person perspective and action-oriented language.'
  },
  {
    id: 'content_completeness',
    name: 'Content Completeness',
    description: 'Check if the CV contains all required elements: summary, projects, technology, competencies, roles, education, courses, certifications, and languages.'
  },
  {
    id: 'summary_quality',
    name: 'Summary Quality',
    description: 'Evaluate the CV summary for strong opening, key skills/experiences, and demonstrated value.'
  },
  {
    id: 'project_descriptions',
    name: 'Project Descriptions',
    description: 'Evaluate project descriptions for proper structure, action-oriented language, role clarity, value contribution, and PARK methodology compliance.'
  },
  {
    id: 'competence_verification',
    name: 'Competence Verification',
    description: 'Verify that all listed competencies and roles are demonstrated in project descriptions.'
  }
];

/**
 * Rating schema - using 0 to 10 scale
 */
export const ratingSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  improved_version: z.string().optional()
});

/**
 * Content completeness schema
 */
export const contentCompletenessSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  element_verification: z.array(
    z.object({
      element: z.string(),
      present: z.boolean(),
      comment: z.string().optional()
    })
  )
});

/**
 * Project descriptions schema
 */
export const projectDescriptionsSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  project_evaluations: z.array(
    z.object({
      project_name: z.string(),
      score: z.number().min(0).max(10),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      improved_version: z.string().optional()
    })
  )
});

/**
 * Competence verification schema
 */
export const competenceVerificationSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  unverified_competencies: z.array(z.string()).optional(),
  unverified_roles: z.array(z.string()).optional()
});

/**
 * Summary evaluation schema with improved version
 */
export const summaryEvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  suggestions: z.array(z.string()),
  improved_version: z.string(),
  original_summary: z.string().optional()
}); 