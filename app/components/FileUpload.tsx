'use client';

import { useState } from 'react';

interface FileUploadProps {
  onCVUpload: (file: File) => void;
  onChecklistUpload?: (file: File) => void;
  showChecklistUpload?: boolean;
}

export default function FileUpload({ 
  onCVUpload, 
  onChecklistUpload, 
  showChecklistUpload = true 
}: FileUploadProps) {
  const [cvFile, setCVFile] = useState<File | null>(null);
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  
  const handleCVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCVFile(file);
      onCVUpload(file);
    }
  };
  
  const handleChecklistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onChecklistUpload) {
      const file = e.target.files[0];
      setChecklistFile(file);
      onChecklistUpload(file);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="cv-file-input" className="block text-sm font-medium">
          Upload your CV (PDF)
        </label>
        <input
          id="cv-file-input"
          type="file"
          accept=".pdf"
          onChange={handleCVChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          aria-label="Upload your CV file"
          title="Choose a CV file in PDF format"
          placeholder="Select CV file"
        />
        {cvFile && (
          <p className="text-sm text-green-600">
            Selected: {cvFile.name}
          </p>
        )}
      </div>
      
      {showChecklistUpload && onChecklistUpload && (
        <div className="space-y-2">
          <label htmlFor="checklist-file-input" className="block text-sm font-medium">
            Upload CV Checklist (or use default)
          </label>
          <input
            id="checklist-file-input"
            type="file"
            accept=".txt"
            onChange={handleChecklistChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            aria-label="Upload CV checklist file"
            title="Choose a checklist file in TXT format"
            placeholder="Select checklist file"
          />
          {checklistFile ? (
            <p className="text-sm text-green-600">
              Selected: {checklistFile.name}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Default checklist will be used if none provided
            </p>
          )}
        </div>
      )}
    </div>
  );
} 