# CV Customization API

This API customizes CVs based on customer requirements using AI agents.

## Overview

The CV customization API analyzes both a consultant's CV and customer requirements documents to generate a tailored CV that highlights the most relevant skills and experiences for a specific customer case.

## How It Works

1. **Document Analysis**: The API processes both the consultant's CV and customer requirements documents using OpenAI's native PDF support.
2. **Requirements Extraction**: It identifies and categorizes customer requirements as "must-have" or "should-have" with priority levels.
3. **Profile Customization**: It tailors the personal profile to highlight relevant experience and skills.
4. **Competencies Extraction**: It identifies and prioritizes the most relevant competencies from the CV.
5. **Project Customization**: It customizes project descriptions using the PARC method (Problem, Accountability, Role, Result).
6. **Evaluation**: It evaluates how well the customized CV meets the customer requirements.

## API Endpoint

```
POST /api/cv-customization
```

### Request Parameters

The API accepts a multipart form with the following fields:

- `cvFile`: The consultant's CV (PDF format)
- `customerFiles`: One or more customer requirements documents (PDF format)
- `modelProvider`: The AI provider to use (currently only supports "openai")
- `modelName`: The specific model to use (e.g., "gpt-4o")

### Response Format

The API returns a JSON response with the following structure:

```json
{
  "result": {
    "customer_requirements": {
      "must_have_requirements": [...],
      "should_have_requirements": [...],
      "context_summary": "..."
    },
    "profile_customization": {
      "original_profile": "...",
      "customized_profile": "...",
      "reasoning": "..."
    },
    "key_competencies": {
      "original_competencies": [...],
      "relevant_competencies": [...],
      "additional_suggested_competencies": [...],
      "reasoning": "..."
    },
    "customized_projects": [...],
    "evaluation": {
      "requirement_coverage": [...],
      "overall_score": 8.5,
      "overall_comments": "...",
      "improvement_suggestions": [...]
    },
    "language_code": "no"
  },
  "logs": [...],
  "timeTaken": "10.5s"
}
```

## Technical Implementation

- Uses OpenAI's Responses API for direct PDF file analysis without needing text extraction
- PDF parsing is handled natively by the AI model, improving text extraction quality
- Multiple PDFs are processed simultaneously with proper context
- Language detection ensures responses match the CV's original language

### Supported Providers

The API is designed to work with multiple LLM providers:

- **OpenAI (Current)**: Using the responses API for direct PDF processing
- **Anthropic Claude (Supported)**: Also has native PDF processing capabilities and can be easily swapped in

To change providers, update the model configuration in the route handler.

## Best Practices

1. **High-Quality PDFs**: Provide clean, well-structured PDFs for better text extraction.
2. **Complete Requirements**: Include detailed customer requirements for better customization.
3. **Comprehensive CV**: Ensure the CV includes detailed project descriptions for optimal customization.
4. **Model Selection**: Use GPT-4o for best results, as it has the strongest reasoning capabilities.

## Error Handling

The API returns appropriate error messages and status codes in case of failures, including:
- 400: Bad Request (missing parameters, unsupported provider)
- 500: Server Error (API failures, processing errors)

## Usage Example

```javascript
const formData = new FormData();
formData.append('cvFile', cvFile);
customerFiles.forEach(file => {
  formData.append('customerFiles', file);
});
formData.append('modelProvider', 'openai');
formData.append('modelName', 'gpt-4o');

const response = await fetch('/api/cv-customization', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
``` 