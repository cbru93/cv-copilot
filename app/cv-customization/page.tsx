'use client';

import { useState } from 'react';
import { 
  Heading, 
  Button, 
  Alert, 
  Card,
  Paragraph,
  Divider
} from '@digdir/designsystemet-react';
import ModelSelector, { ModelOption } from '../components/ModelSelector';
import MultiFileUpload from '../components/MultiFileUpload';
import CustomizationResults from '../components/CustomizationResults';

export default function CVCustomization() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [customerFiles, setCustomerFiles] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'OpenAI GPT-4o'
  });
  const [result, setResult] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCVUpload = (file: File) => {
    setError(null);
    setCvFile(file);
  };

  const handleCustomerFilesUpload = (files: File[]) => {
    setError(null);
    setCustomerFiles(files);
  };

  const handleCustomize = async () => {
    if (!cvFile) {
      setError('Please upload a CV file first.');
      return;
    }

    if (customerFiles.length === 0) {
      setError('Please upload at least one customer requirements file.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult({});

      const formData = new FormData();
      formData.append('cvFile', cvFile);
      
      // Add all customer files
      customerFiles.forEach(file => {
        formData.append('customerFiles', file);
      });
      
      formData.append('modelProvider', selectedModel.provider);
      formData.append('modelName', selectedModel.model);

      const response = await fetch('/api/cv-customization', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        
        try {
          errorData = await response.json();
          
          if (errorData.logs && Array.isArray(errorData.logs)) {
            const errorWithLogs = {
              error: errorData.error || `Failed to customize CV: ${response.status}`,
              details: errorData.details || response.statusText,
              logs: errorData.logs
            };
            
            throw new Error(errorData.error || `Failed to customize CV: ${response.status} ${response.statusText}`);
          }
        } catch (e: unknown) {
          errorData = { 
            error: `Failed to parse error response: ${response.status} ${response.statusText}` 
          };
        }
        
        throw new Error(errorData.error || `Failed to customize CV: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during customization. Please try again.');
      }
      console.error('Customization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Heading level={1} data-size="xl">CV Customization Tool</Heading>
          <Paragraph data-size="md" className="max-w-3xl mx-auto">
            Customize your CV to match specific customer requirements. Upload your CV and customer requirements documents to get tailored recommendations.
          </Paragraph>
        </div>

        <div className="flex flex-col gap-8">
          <Card>
            <Card.Block>
              <Heading level={2} data-size="sm">Upload Documents & Configure</Heading>
            </Card.Block>
            <Card.Block>
              <MultiFileUpload 
                onCVUpload={handleCVUpload} 
                onCustomerFilesUpload={handleCustomerFilesUpload}
              />
              
              <Divider data-spacing="true" className="my-4" />
              
              <div className="space-y-4">
                <ModelSelector onModelSelect={setSelectedModel} defaultProvider="openai" />
                
                <Alert data-color="info" className="mt-2">
                  <Paragraph data-size="xs">
                    <strong>Note:</strong> CV customization works best with OpenAI models (GPT-4o recommended). This feature uses specialized AI agents to analyze your CV and customer requirements to provide tailored recommendations.
                  </Paragraph>
                </Alert>
                
                {selectedModel.provider !== 'openai' && (
                  <Alert data-color="danger" className="mt-2">
                    <Paragraph data-size="xs">
                      <strong>Warning:</strong> CV customization currently only supports OpenAI models. Please select an OpenAI model to use this feature.
                    </Paragraph>
                  </Alert>
                )}

                <Button
                  variant="primary"
                  onClick={handleCustomize}
                  disabled={!cvFile || customerFiles.length === 0 || isLoading || selectedModel.provider !== 'openai'}
                  className="w-full"
                >
                  {isLoading ? 'Processing...' : 'Customize CV'}
                </Button>

                {error && (
                  <Alert data-color="danger">
                    {error}
                  </Alert>
                )}
              </div>
            </Card.Block>
          </Card>

          <Card>
            <Card.Block>
              <Heading level={2} data-size="sm">
                Customization Results
              </Heading>
            </Card.Block>
            
            <Card.Block>
              <CustomizationResults 
                result={result} 
                isLoading={isLoading}
              />
            </Card.Block>
          </Card>
        </div>

        <div className="mt-10 text-center">
          <Paragraph data-size="xs" data-color="subtle">
            Built with Next.js and the Vercel AI SDK. Upload your CV and customer documents to get started.
          </Paragraph>
        </div>
      </div>
    </main>
  );
} 