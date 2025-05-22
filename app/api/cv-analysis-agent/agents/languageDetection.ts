import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';
import { logDebug } from '../utils';

export interface LanguageDetectionResult {
  language: string;
  languageCode: string;
  confidence: number;
}

export interface LanguageDetectionAgentInput {
  model: LanguageModel;
  fileBuffer: Buffer;
  fileName: string;
}

/**
 * Language Detection Agent - detects the primary language used in the document
 */
export async function runLanguageDetectionAgent({
  model,
  fileBuffer,
  fileName,
}: LanguageDetectionAgentInput): Promise<LanguageDetectionResult> {
  try {
    const languageResult = await generateObject({
      model,
      schema: z.object({
        language: z.string().describe('The detected language name (e.g., English, Norwegian, German)'),
        languageCode: z.string().describe('The ISO language code (e.g., en, no, de)'),
        confidence: z.number().min(0).max(1).describe('Confidence level of detection')
      }),
      system: 'You are a language detection specialist. Analyze the document and identify the primary language used.',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What language is this document written in? Provide the language name, ISO code, and your confidence level.',
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

    const result: LanguageDetectionResult = {
      language: languageResult.object.language || 'English',
      languageCode: languageResult.object.languageCode || 'en',
      confidence: languageResult.object.confidence || 0.8
    };

    logDebug(`Language detected: ${result.language} (${result.languageCode}) with ${result.confidence * 100}% confidence`);
    return result;
  } catch (e) {
    logDebug('Error in language detection:', e);
    
    // Return default values in case of error
    return {
      language: 'English',
      languageCode: 'en',
      confidence: 0.5
    };
  }
} 