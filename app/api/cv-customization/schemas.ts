import { z } from 'zod';

/**
 * Schema for customer requirements analysis
 */
export const customerRequirementsSchema = z.object({
  must_have_requirements: z.array(
    z.object({
      requirement: z.string(),
      description: z.string(),
      priority: z.string()
    })
  ),
  should_have_requirements: z.array(
    z.object({
      requirement: z.string(),
      description: z.string(),
      priority: z.string()
    })
  ),
  context_summary: z.string()
});

/**
 * Schema for CV customization summary
 */
export const cvCustomizationSummarySchema = z.object({
  original_profile: z.string(),
  customized_profile: z.string(),
  reasoning: z.string()
});

/**
 * Schema for key competencies
 */
export const keyCompetenciesSchema = z.object({
  original_competencies: z.array(z.string()),
  relevant_competencies: z.array(z.string()),
  additional_suggested_competencies: z.array(z.string()),
  reasoning: z.string()
});

/**
 * Schema for project customization
 */
export const projectCustomizationSchema = z.object({
  project_name: z.string(),
  original_description: z.string(),
  customized_description: z.string(),
  relevance_score: z.number().min(0).max(10),
  parc_analysis: z.object({
    problem: z.string(),
    accountability: z.string(),
    role: z.string(),
    result: z.string()
  }),
  reasoning: z.string()
});

/**
 * Schema for the complete CV customization result
 */
export const cvCustomizationResultSchema = z.object({
  customer_requirements: customerRequirementsSchema,
  profile_customization: cvCustomizationSummarySchema,
  key_competencies: keyCompetenciesSchema,
  customized_projects: z.array(projectCustomizationSchema),
  evaluation: z.object({
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
  }),
  language_code: z.string()
}); 