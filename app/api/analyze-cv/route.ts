import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { mistral } from '@ai-sdk/mistral';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { config, isProviderAvailable } from '../config';

export const maxDuration = 60; // Allow up to 60 seconds for processing

export async function POST(req: NextRequest) {
  try {
    const { pdfText, checklistText, analysisType, modelProvider, modelName } = await req.json();

    if (!pdfText || !checklistText) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check if the requested provider is available
    if (!isProviderAvailable(modelProvider)) {
      return NextResponse.json(
        { error: `${modelProvider} API key is not configured` },
        { status: 400 }
      );
    }

    // Create prompt based on the analysis type
    let prompt = '';
    if (analysisType === 'summary') {
      prompt = `Analyze the CV summary in the following CV content and evaluate it against the CV writing recommendations in the checklist:

CV Content:
${pdfText}

Checklist:
${checklistText}

Focus on the Summary checklist section in the checklist document. Evaluate the CV summary (the top-most paragraph in the CV) against these recommendations and provide an overview of strengths and weaknesses.

Then, provide a rephrased version of the summary that follows all the recommendations in the checklist. Use all information from the CV, especially the project experience information (recent assignments are more important) and the existing summary.

Format your response as follows:
## Summary Analysis
[Your analysis of the summary here, highlighting strengths and weaknesses]

## Improved Version:
[Your improved version of the summary]`;
    } else if (analysisType === 'assignments') {
      prompt = `Analyze the Key Assignments descriptions in the following CV content and evaluate them against the CV writing recommendations in the checklist:

CV Content:
${pdfText}

Checklist:
${checklistText}

Focus on the "Key assignments" section in the checklist document. Process all Key Assignments in the CV content, do not skip any of them. Evaluate each Key Assignment section against the recommendations and provide an overview of issues found.

Format your response as follows:
## Overall Issues
[Provide an overview of the biggest issues found across all assignments]

For each assignment, include:
## [Assignment Title]
### Original:
[Original text]

### Issues:
[Brief overview of issues found]

### Improved Version:
[Improved version that follows all the recommendations]`;
    }

    // Configure the provider
    let model;
    switch (modelProvider) {
      case 'openai':
        // Set OpenAI API key in environment before creating model
        process.env.OPENAI_API_KEY = config.openai.apiKey;
        model = openai(modelName);
        break;
      case 'anthropic':
        // Set Anthropic API key in environment before creating model
        process.env.ANTHROPIC_API_KEY = config.anthropic.apiKey;
        model = anthropic(modelName);
        break;
      case 'mistral':
        // Set Mistral API key in environment before creating model
        process.env.MISTRAL_API_KEY = config.mistral.apiKey;
        model = mistral(modelName);
        break;
      case 'google':
        // Set Google API key in environment before creating model
        process.env.GOOGLE_API_KEY = config.google.apiKey;
        model = google(modelName);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid model provider' },
          { status: 400 }
        );
    }

    // Generate text using the AI SDK
    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.7,
      maxTokens: 4000,
    });

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Error processing CV analysis:', error);
    return NextResponse.json(
      { error: 'Error processing CV analysis' },
      { status: 500 }
    );
  }
} 