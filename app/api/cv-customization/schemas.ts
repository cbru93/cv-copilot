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
 * Schema for validation results
 */
export const validationResultSchema = z.object({
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
 * Schema for correction results
 */
export const correctionResultSchema = z.object({
  corrected_profile: z.object({
    profile: z.string(),
    changes_made: z.array(z.string()),
    reasoning: z.string()
  }),
  corrected_competencies: z.object({
    competencies: z.array(z.string()),
    removed_competencies: z.array(z.string()),
    reasoning: z.string()
  }),
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
    reasoning: z.string()
  })),
  correction_summary: z.object({
    total_issues_fixed: z.number(),
    major_changes: z.array(z.string()),
    quality_improvements: z.array(z.string()),
    confidence_score: z.number().min(0).max(10)
  })
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
  validation: validationResultSchema,
  language_code: z.string(),
  correction: correctionResultSchema.optional()
}); 