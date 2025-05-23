# CV Customization API

This API provides AI-powered CV customization services that analyze customer requirements and tailor CV content accordingly. The API includes comprehensive validation to ensure all customized content remains factually grounded in the original CV.

## Features

- **Multi-step CV Analysis**: Language detection, requirements analysis, profile/competencies/projects customization
- **Content Validation**: Ensures all customized content is factually accurate and grounded in the original CV
- **Real-time Progress Updates**: Streaming endpoint provides live updates as each step completes
- **Parallel Processing**: Profile, competencies, and projects are customized simultaneously for efficiency
- **Comprehensive Evaluation**: Assessment of how well the customized CV meets customer requirements

## Endpoints

### Standard Endpoint
- **POST** `/api/cv-customization`
- Returns complete results when all processing is finished
- Better for programmatic access or when progress updates aren't needed

### Streaming Endpoint (Recommended)
- **POST** `/api/cv-customization/stream`
- Provides real-time progress updates via Server-Sent Events (SSE)
- Better user experience with live feedback
- Returns the same final results as the standard endpoint

## Request Format

Both endpoints accept multipart/form-data with the following fields:

- `cvFile`: PDF file of the candidate's CV
- `customerFiles`: One or more PDF files containing customer requirements
- `modelProvider`: Must be "openai" (only supported provider)
- `modelName`: OpenAI model name (e.g., "gpt-4o", "gpt-4o-mini")

## Response Format

### Standard Endpoint Response
```json
{
  "result": {
    "customer_requirements": {
      "context_summary": "...",
      "must_have_requirements": [...],
      "should_have_requirements": [...]
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
      "overall_score": 8.5,
      "overall_comments": "...",
      "requirement_coverage": [...],
      "improvement_suggestions": [...]
    },
    "validation": {
      "overall_validation": {
        "passes_validation": true,
        "confidence_score": 9.2,
        "summary": "...",
        "recommendations": [...]
      },
      "profile_validation": {
        "is_factually_accurate": true,
        "fabricated_claims": [],
        "unsupported_claims": [],
        "reasoning": "...",
        "corrected_profile": "..." // Optional
      },
      "competencies_validation": {
        "unsupported_competencies": [],
        "reasoning": "..."
      },
      "projects_validation": [...]
    },
    "language_code": "en"
  },
  "logs": [...],
  "timeTaken": "45.2s"
}
```

### Streaming Endpoint Response
Server-Sent Events with progress updates:

```
data: {"step":"validation","status":"starting","message":"Validating input parameters...","progress":5}

data: {"step":"validation","status":"completed","message":"Input validation completed successfully","progress":10}

data: {"step":"file_processing","status":"starting","message":"Processing CV and customer files...","progress":15}

...

data: {"step":"complete","status":"completed","message":"CV customization completed successfully!","data":{...},"progress":100}
```

## Processing Steps

1. **Input Validation** (5-10%): Validate files and parameters
2. **File Processing** (10-20%): Read and process PDF files
3. **Language Detection** (20-30%): Detect CV language for localized responses
4. **Requirements Analysis** (30-45%): Extract and categorize customer requirements
5. **Customization** (45-75%): Parallel customization of profile, competencies, and projects
   - Profile Customization (60%)
   - Competencies Customization (65%)
   - Projects Customization (70%)
6. **Evaluation** (75-85%): Assess how well customized CV meets requirements
7. **Content Validation** (85-95%): Verify factual accuracy of all customizations
8. **Completion** (100%): Final result ready

## Validation Features

The validation step ensures customized content is:

- **Factually Accurate**: No fabricated information
- **Grounded**: All claims supported by original CV
- **Conservative**: Flags potential issues rather than allowing questionable content
- **Corrective**: Provides improved versions when issues are found

### Validation Checks

- **Profile Validation**: Checks for fabricated or unsupported claims in the customized summary
- **Competencies Validation**: Ensures all competencies are mentioned in the original CV
- **Projects Validation**: Verifies project descriptions don't contain invented details

## Usage Examples

### Frontend Implementation (Streaming)
```javascript
const response = await fetch('/api/cv-customization/stream', {
  method: 'POST',
  body: formData,
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const update = JSON.parse(line.slice(6));
      updateProgress(update);
    }
  }
}
```

### Frontend Implementation (Standard)
```javascript
const response = await fetch('/api/cv-customization', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result.result);
```

## Error Handling

Both endpoints provide detailed error information:

- Validation errors: Missing files or unsupported providers
- Processing errors: File reading or AI model issues
- Timeout errors: Azure Static Web Apps 230-second limit

Streaming endpoint provides real-time error notifications, while standard endpoint returns errors in the final response.

## Performance Considerations

- **Parallel Processing**: Profile, competencies, and projects are processed simultaneously
- **Streaming**: Provides better perceived performance with real-time updates
- **Edge Runtime**: Optimized for fast startup and low latency
- **Timeout Handling**: Designed to work within Azure Static Web Apps limits

## Best Practices

1. **Use Streaming Endpoint**: Better user experience with progress updates
2. **OpenAI Models**: Currently the only supported provider
3. **File Size Limits**: Keep PDF files reasonable for processing speed
4. **Validation Review**: Always check validation results before using customized content
5. **Error Handling**: Implement proper error handling for network issues

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