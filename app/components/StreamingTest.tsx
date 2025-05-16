'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import FileUpload from './FileUpload';
import { 
  Card, 
  Heading, 
  Paragraph, 
  Button, 
  Skeleton
} from '@digdir/designsystemet-react';

// Schema for our streaming analysis
const streamingSummaryAnalysisSchema = z.object({
  original_summary: z.string().optional(),
  analysis: z.string().optional(),
  improved_summary: z.string().optional()
});

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

  const handleCVUpload = (file: File) => {
    setCvFile(file);
  };

  const handleAnalyze = async () => {
    if (!cvFile) return;
    
    setIsLoading(true);
    setRawResponse('');
    setAnalysis({
      original_summary: '',
      analysis: '',
      improved_summary: ''
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
        throw new Error('Network response was not ok');
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
          break;
        }
        
        // Decode the chunk and add to raw response
        const chunk = decoder.decode(value, { stream: true });
        setRawResponse(prev => prev + chunk);
        
        // Process character by character for more granular streaming
        for (let i = 0; i < chunk.length; i++) {
          const char = chunk[i];
          buffer += char;
          
          // If we're in a field value string, process the character
          if (currentField && inString) {
            if (escapeNext) {
              escapeNext = false;
              fieldValue += char;
            } else if (char === '\\') {
              escapeNext = true;
            } else if (char === '"' && !escapeNext) {
              // End of string
              inString = false;
              
              // Update the field with the complete value
              setAnalysis(prev => ({
                ...prev,
                [currentField]: fieldValue
              }));
              
              currentField = '';
              fieldValue = '';
            } else {
              // Regular character in the string
              fieldValue += char;
              
              // Update state with each character as it comes in
              setAnalysis(prev => ({
                ...prev,
                [currentField]: fieldValue
              }));
            }
          } else {
            // Look for field markers
            if (buffer.endsWith('"original_summary":')) {
              currentField = 'original_summary';
              // Wait for the string to start
              if (buffer.endsWith('":')) {
                // The next non-whitespace character should be a quote
                let j = i + 1;
                while (j < chunk.length && /\s/.test(chunk[j])) j++;
                if (j < chunk.length && chunk[j] === '"') {
                  inString = true;
                  fieldValue = '';
                  // Skip whitespace
                  i = j;
                }
              }
            } else if (buffer.endsWith('"analysis":')) {
              currentField = 'analysis';
              // Wait for the string to start
              if (buffer.endsWith('":')) {
                // The next non-whitespace character should be a quote
                let j = i + 1;
                while (j < chunk.length && /\s/.test(chunk[j])) j++;
                if (j < chunk.length && chunk[j] === '"') {
                  inString = true;
                  fieldValue = '';
                  // Skip whitespace
                  i = j;
                }
              }
            } else if (buffer.endsWith('"improved_summary":')) {
              currentField = 'improved_summary';
              // Wait for the string to start
              if (buffer.endsWith('":')) {
                // The next non-whitespace character should be a quote
                let j = i + 1;
                while (j < chunk.length && /\s/.test(chunk[j])) j++;
                if (j < chunk.length && chunk[j] === '"') {
                  inString = true;
                  fieldValue = '';
                  // Skip whitespace
                  i = j;
                }
              }
            }
          }
        }
        
        // Also try to parse complete JSON objects as a fallback
        try {
          const jsonMatch = buffer.match(/{[^}]*}/);
          if (jsonMatch) {
            const jsonObject = JSON.parse(jsonMatch[0]);
            
            // Use the parsed JSON as a fallback for any missing fields
            setAnalysis(current => ({
              ...current,
              ...jsonObject
            }));
            
            // Remove the parsed portion from the buffer
            buffer = buffer.substring(jsonMatch.index! + jsonMatch[0].length);
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
      
      // Try one final parse of the complete data to ensure we have everything
      try {
        const jsonRegex = /{[^]*}/;
        const match = rawResponse.match(jsonRegex);
        
        if (match) {
          const jsonObject = JSON.parse(match[0]);
          setAnalysis(current => ({
            ...current,
            ...jsonObject
          }));
        }
      } catch (e) {
        console.error('Final JSON parsing error:', e);
      }
      
    } catch (error) {
      console.error('Error in streaming analysis:', error);
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
        </Card.Block>
      </Card>
      
      {isLoading && (
        <Card>
          <Card.Block>
            <Heading level={3} data-size="xs">Analysis In Progress</Heading>
            <div className="space-y-4 mt-4">
              <Skeleton variant="rectangle" height={24} width="75%" />
              <Skeleton variant="rectangle" height={16} />
              <Skeleton variant="rectangle" height={16} />
              <Skeleton variant="rectangle" height={16} />
            </div>
          </Card.Block>
        </Card>
      )}
      
      {rawResponse && (
        <Card>
          <Card.Block>
            <Heading level={3} data-size="xs">Raw Streaming Output</Heading>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-60 text-xs">
              {rawResponse}
            </pre>
          </Card.Block>
        </Card>
      )}
      
      {analysis && (
        <Card>
          <Card.Block>
            <Heading level={3} data-size="xs">Original Summary</Heading>
            {analysis.original_summary !== undefined ? (
              <Paragraph>{analysis.original_summary}</Paragraph>
            ) : (
              <Skeleton variant="rectangle" height={16} />
            )}
          </Card.Block>
          
          <Card.Block>
            <Heading level={3} data-size="xs">Analysis</Heading>
            {analysis.analysis !== undefined ? (
              <Paragraph>{analysis.analysis}</Paragraph>
            ) : (
              <Skeleton variant="rectangle" height={16} />
            )}
          </Card.Block>
          
          <Card.Block>
            <Heading level={3} data-size="xs">Improved Summary</Heading>
            {analysis.improved_summary !== undefined ? (
              <Paragraph>{analysis.improved_summary}</Paragraph>
            ) : (
              <Skeleton variant="rectangle" height={16} />
            )}
          </Card.Block>
        </Card>
      )}
    </div>
  );
} 