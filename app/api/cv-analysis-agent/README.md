# CV Analysis Agent API

This directory contains the CV analysis agent API endpoint that provides comprehensive CV evaluation using specialized AI agents.

## Directory Structure

- `route.ts` - Main API endpoint that handles HTTP requests and orchestrates the CV analysis process
- `utils.ts` - Utility functions for logging, environment info, and response headers
- `schemas.ts` - Zod schema definitions for validating agent responses
- `agents/` - Directory containing specialized agents for different aspects of CV analysis
  - `index.ts` - Exports all agent functions and common types
  - `languageDetection.ts` - Language detection agent
  - `languageQuality.ts` - Language quality evaluation agent
  - `contentCompleteness.ts` - Content completeness evaluation agent
  - `summaryQuality.ts` - Summary quality evaluation agent
  - `projectDescriptions.ts` - Project descriptions evaluation agent
  - `competenceVerification.ts` - Competence verification agent
  - `resultProcessing.ts` - Utility functions for processing agent results

## Flow

1. The API endpoint receives a PDF file and checklist texts in a POST request
2. Language detection is performed to identify the language of the CV
3. Multiple specialized agents analyze different aspects of the CV in parallel
4. Results are aggregated and processed to generate an overall evaluation
5. The complete evaluation is returned in a structured JSON format

## Agent Types

Each agent evaluates a specific aspect of the CV:

- **Language Detection Agent**: Detects the primary language used in the CV
- **Language Quality Agent**: Evaluates grammar, spelling, tone, and writing style
- **Content Completeness Agent**: Checks if the CV contains all standard elements
- **Summary Quality Agent**: Evaluates the CV summary for strong opening, key skills/experiences, and demonstrated value
- **Project Descriptions Agent**: Evaluates project descriptions for proper structure, action-oriented language, and value demonstration
- **Competence Verification Agent**: Verifies consistency between listed competencies/roles and project descriptions

## Response Format

The API returns a structured response with:

- Overall score
- Summary of the evaluation
- Key strengths and improvement areas
- Detailed analysis from each specialized agent
- Improved versions of problematic content 