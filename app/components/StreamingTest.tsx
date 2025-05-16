'use client';

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import FileUpload from './FileUpload';
import { 
  Card, 
  Heading, 
  Paragraph, 
  Button, 
  Skeleton,
  Alert,
  Tag
} from '@digdir/designsystemet-react';

// Schema for our streaming analysis
const streamingSummaryAnalysisSchema = z.object({
  original_summary: z.string().optional(),
  analysis: z.string().optional(),
  improved_summary: z.string().optional()
});

// Utility to safely parse JSON while handling partial or invalid JSON 
const safeJsonParse = (text: string) => {
  try {
    const jsonMatch = text.match(/{[^]*}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Silent fail for invalid JSON
  }
  return null;
};

// Loading animation component
const StreamingAnimation = () => (
  <div className="flex items-center justify-center py-6">
    <div className="flex space-x-2">
      <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
    <p className="ml-3 text-sm text-gray-600">AI is analyzing your CV...</p>
  </div>
);

export default function StreamingTest() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [summaryChecklistText, setSummaryChecklistText] = useState<string>(
    `A good CV summary should:
1. Be concise (3-4 sentences maximum)
2. Highlight key skills and experiences
3. Avoid generic statements and clichés
4. Be tailored to the position
5. Include quantifiable achievements when possible`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [analysis, setAnalysis] = useState<{
    original_summary?: string;
    analysis?: string;
    improved_summary?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldsComplete, setFieldsComplete] = useState<{
    original_summary: boolean;
    analysis: boolean;
    improved_summary: boolean;
  }>({
    original_summary: false,
    analysis: false,
    improved_summary: false
  });

  const handleCVUpload = useCallback((file: File) => {
    setCvFile(file);
    setError(null);
  }, []);

  // Processing function to extract field values character by character
  const processJsonStream = useCallback((
    buffer: string, 
    currentField: string, 
    inString: boolean, 
    escapeNext: boolean,
    fieldValue: string,
    chunk: string
  ) => {
    let localBuffer = buffer;
    let localCurrentField = currentField;
    let localInString = inString;
    let localEscapeNext = escapeNext;
    let localFieldValue = fieldValue;
    let updateObj: Record<string, string> = {};
    let updatedFieldsComplete: Partial<typeof fieldsComplete> = {};
    
    // Process character by character
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      localBuffer += char;
      
      // If we're in a field value string, process the character
      if (localCurrentField && localInString) {
        if (localEscapeNext) {
          localEscapeNext = false;
          localFieldValue += char;
        } else if (char === '\\') {
          localEscapeNext = true;
        } else if (char === '"' && !localEscapeNext) {
          // End of string
          localInString = false;
          
          // Mark field as complete when string ends
          updatedFieldsComplete[localCurrentField as keyof typeof fieldsComplete] = true;
          updateObj[localCurrentField] = localFieldValue;
          
          localCurrentField = '';
          localFieldValue = '';
        } else {
          // Regular character in the string
          localFieldValue += char;
          
          // Update with each character as it comes in
          if (!updateObj[localCurrentField]) {
            updateObj[localCurrentField] = localFieldValue;
          } else {
            updateObj[localCurrentField] = localFieldValue;
          }
        }
      } else {
        // Look for field markers
        if (localBuffer.endsWith('"original_summary":')) {
          localCurrentField = 'original_summary';
          checkAndStartString(i);
        } else if (localBuffer.endsWith('"analysis":')) {
          localCurrentField = 'analysis';
          checkAndStartString(i);
        } else if (localBuffer.endsWith('"improved_summary":')) {
          localCurrentField = 'improved_summary';
          checkAndStartString(i);
        }
      }
      
      // Helper function to check for and start string processing
      function checkAndStartString(index: number) {
        if (localBuffer.endsWith('":')) {
          // Look ahead for the opening quote
          let j = index + 1;
          while (j < chunk.length && /\s/.test(chunk[j])) j++;
          if (j < chunk.length && chunk[j] === '"') {
            localInString = true;
            localFieldValue = '';
            // Skip whitespace and the quote
            i = j;
          }
        }
      }
    }
    
    // Return updated state
    return {
      buffer: localBuffer,
      currentField: localCurrentField,
      inString: localInString,
      escapeNext: localEscapeNext,
      fieldValue: localFieldValue,
      updateObj,
      updatedFieldsComplete
    };
  }, [fieldsComplete]);

  const handleAnalyze = async () => {
    if (!cvFile) return;
    
    setIsLoading(true);
    setRawResponse('');
    setError(null);
    setAnalysis({
      original_summary: '',
      analysis: '',
      improved_summary: ''
    });
    setFieldsComplete({
      original_summary: false,
      analysis: false,
      improved_summary: false
    });
    
    try {
      const formData = new FormData();
      formData.append('file', cvFile);
      formData.append('summaryChecklistText', summaryChecklistText);
      formData.append('modelProvider', 'openai');
      formData.append('modelName', 'gpt-4o');
      
      // Start the streaming analysis
      const response = await fetch('/api/stream-cv-analysis', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // Create a ReadableStream for processing the response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Could not get reader from response');
      }

      // Create a TextDecoder to convert the byte stream to text
      const decoder = new TextDecoder();
      
      // Current parsing state
      let buffer = '';
      let currentField = '';
      let inString = false;
      let escapeNext = false;
      let fieldValue = '';

      // Parse streaming characters
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // If we have a currentField when done, make sure it's completed
          if (currentField && inString) {
            setFieldsComplete(prev => ({ 
              ...prev, 
              [currentField]: true 
            }));
          }
          break;
        }
        
        // Decode the chunk and add to raw response
        const chunk = decoder.decode(value, { stream: true });
        setRawResponse(prev => prev + chunk);
        
        // Process the chunk character by character
        const result = processJsonStream(buffer, currentField, inString, escapeNext, fieldValue, chunk);
        
        // Update state
        buffer = result.buffer;
        currentField = result.currentField;
        inString = result.inString;
        escapeNext = result.escapeNext;
        fieldValue = result.fieldValue;
        
        // Update analysis with streamed content
        if (Object.keys(result.updateObj).length > 0) {
          setAnalysis(prev => ({
            ...prev,
            ...result.updateObj
          }));
        }
        
        // Update completed fields
        if (Object.keys(result.updatedFieldsComplete).length > 0) {
          setFieldsComplete(prev => ({
            ...prev,
            ...result.updatedFieldsComplete
          }));
        }
        
        // Also try to parse complete JSON objects as a fallback
        const jsonObject = safeJsonParse(buffer);
        if (jsonObject) {
          // Use parsed JSON as a fallback for any missing fields
          setAnalysis(current => ({
            ...current,
            ...jsonObject
          }));
          
          // Remove the parsed portion from the buffer
          const jsonMatch = buffer.match(/{[^}]*}/);
          if (jsonMatch && jsonMatch.index !== undefined) {
            buffer = buffer.substring(jsonMatch.index + jsonMatch[0].length);
          }
        }
      }
      
      // Try one final parse of the complete data to ensure we have everything
      const jsonObject = safeJsonParse(rawResponse);
      if (jsonObject) {
        setAnalysis(current => ({
          ...current,
          ...jsonObject
        }));
        
        // Mark all fields as complete
        setFieldsComplete({
          original_summary: true,
          analysis: true,
          improved_summary: true
        });
      }
      
    } catch (error) {
      console.error('Error in streaming analysis:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <Card.Block>
          <Heading level={2} data-size="sm">Streaming CV Summary Analysis Test</Heading>
          <Paragraph>
            This is a test of the streaming CV analysis functionality. Upload a CV and see the analysis results stream in real-time.
          </Paragraph>
        </Card.Block>
        
        <Card.Block>
          <FileUpload 
            onCVUpload={handleCVUpload} 
            showChecklistUpload={false}
          />
          
          <div className="mt-4">
            <Button 
              onClick={handleAnalyze} 
              disabled={!cvFile || isLoading}
              variant="primary"
            >
              {isLoading ? 'Analyzing...' : 'Analyze CV'}
            </Button>
          </div>
          
          {error && (
            <Alert data-color="danger" className="mt-4">
              {error}
            </Alert>
          )}
        </Card.Block>
      </Card>
      
      {(isLoading || analysis) && (
        <Card>
          <Card.Block className="min-h-[300px]">
            <div className="flex justify-between items-center">
              <Heading level={3} data-size="xs">Original Summary</Heading>
              {fieldsComplete.original_summary && (
                <Tag data-color="success">Complete</Tag>
              )}
            </div>
            {analysis?.original_summary !== undefined ? (
              <Paragraph>{analysis.original_summary}</Paragraph>
            ) : (
              <Skeleton variant="rectangle" height={16} />
            )}
          </Card.Block>
          
          <Card.Block className="min-h-[300px]">
            <div className="flex justify-between items-center">
              <Heading level={3} data-size="xs">Analysis</Heading>
              {fieldsComplete.analysis && (
                <Tag data-color="success">Complete</Tag>
              )}
            </div>
            {analysis?.analysis !== undefined ? (
              <Paragraph>{analysis.analysis}</Paragraph>
            ) : (
              <Skeleton variant="rectangle" height={16} />
            )}
          </Card.Block>
          
          <Card.Block className="min-h-[300px]">
            <div className="flex justify-between items-center">
              <Heading level={3} data-size="xs">Improved Summary</Heading>
              {fieldsComplete.improved_summary && (
                <Tag data-color="success">Complete</Tag>
              )}
            </div>
            {analysis?.improved_summary !== undefined ? (
              <Paragraph>{analysis.improved_summary}</Paragraph>
            ) : (
              <Skeleton variant="rectangle" height={16} />
            )}
          </Card.Block>
          
          {isLoading && <StreamingAnimation />}
        </Card>
      )}
    </div>
  );
} 