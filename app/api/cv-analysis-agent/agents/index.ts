// Export all agent functions
export { runLanguageQualityAgent } from './languageQuality';
export { runContentCompletenessAgent } from './contentCompleteness';
export { runSummaryQualityAgent } from './summaryQuality';
export { runProjectDescriptionsAgent, fixProjectDescriptionsScore } from './projectDescriptions';
export { runCompetenceVerificationAgent } from './competenceVerification';
export { runLanguageDetectionAgent, type LanguageDetectionResult } from './languageDetection';

// Export agent result processing functions and types
export { 
  generateOverallSummary,
  extractStrengths,
  extractImprovementAreas,
  type AgentResult
} from './resultProcessing';

// Common agent types
import type { LanguageModel } from 'ai';

export interface BaseAgentInput {
  model: LanguageModel;
  fileBuffer: Buffer;
  fileName: string;
  languageInstruction: string;
}