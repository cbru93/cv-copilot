'use client';

import { useState } from 'react';
import { Button, Paragraph, Tag, Alert } from '@digdir/designsystemet-react';

interface FileUploadProps {
  onCVUpload: (file: File) => void;
  onCustomerFilesUpload: (files: File[]) => void;
  maxFileSize?: number; // in MB
}

export default function MultiFileUpload({ 
  onCVUpload, 
  onCustomerFilesUpload,
  maxFileSize = 10 // Default 10MB
}: FileUploadProps) {
  const [cvFile, setCVFile] = useState<File | null>(null);
  const [customerFiles, setCustomerFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const maxFileSizeBytes = maxFileSize * 1024 * 1024;
  
  const handleCVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size
      if (file.size > maxFileSizeBytes) {
        setError(`CV file exceeds maximum size of ${maxFileSize}MB`);
        return;
      }
      
      // Check file type
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed for CV');
        return;
      }
      
      setCVFile(file);
      onCVUpload(file);
    }
  };
  
  const handleCustomerFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Check file sizes and types
      for (const file of files) {
        if (file.size > maxFileSizeBytes) {
          setError(`File "${file.name}" exceeds maximum size of ${maxFileSize}MB`);
          return;
        }
        
        if (file.type !== 'application/pdf') {
          setError(`File "${file.name}" is not a PDF file. Only PDF files are allowed.`);
          return;
        }
      }
      
      setCustomerFiles(files);
      onCustomerFilesUpload(files);
    }
  };
  
  const removeCustomerFile = (index: number) => {
    const updatedFiles = [...customerFiles];
    updatedFiles.splice(index, 1);
    setCustomerFiles(updatedFiles);
    onCustomerFilesUpload(updatedFiles);
  };
  
  return (
    <div className="space-y-6">
      <div className="p-4 border border-gray-200 rounded-md space-y-4">
        <div className="space-y-2">
          <label htmlFor="cv-file-upload" className="block text-sm font-medium">
            Upload your CV (PDF)
          </label>
          <input
            id="cv-file-upload"
            type="file"
            accept=".pdf"
            onChange={handleCVChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            aria-label="Upload your CV"
            title="Choose a CV file"
          />
          {cvFile && (
            <div className="flex items-center mt-2">
              <Tag data-color="success" className="mr-2">{cvFile.name}</Tag>
              <Paragraph data-size="xs" data-color="subtle">
                {(cvFile.size / (1024 * 1024)).toFixed(2)} MB
              </Paragraph>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border border-gray-200 rounded-md space-y-4">
        <div className="space-y-2">
          <label htmlFor="customer-files-upload" className="block text-sm font-medium">
            Upload Customer Requirements (PDFs)
          </label>
          <input
            id="customer-files-upload"
            type="file"
            accept=".pdf"
            multiple
            onChange={handleCustomerFilesChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            aria-label="Upload customer requirements"
            title="Choose customer requirements files"
          />
          
          {customerFiles.length > 0 && (
            <div className="mt-4">
              <Paragraph data-size="sm" className="mb-2">
                Selected customer files ({customerFiles.length}):
              </Paragraph>
              <div className="space-y-2">
                {customerFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <Tag data-color="info" className="mr-2">{file.name}</Tag>
                      <Paragraph data-size="xs" data-color="subtle">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </Paragraph>
                    </div>
                    <Button
                      variant="tertiary"
                      data-size="sm"
                      onClick={() => removeCustomerFile(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <Alert data-color="danger">
          {error}
        </Alert>
      )}
      
      <div className="mt-2">
        <Paragraph data-size="xs" data-color="subtle">
          Maximum file size: {maxFileSize}MB. Only PDF files are supported.
        </Paragraph>
      </div>
    </div>
  );
} 