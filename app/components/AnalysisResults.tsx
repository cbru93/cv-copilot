'use client';

import { useState } from 'react';

interface AnalysisResultsProps {
  result: string;
  isLoading: boolean;
}

export default function AnalysisResults({ result, isLoading }: AnalysisResultsProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  // Helper function to identify and format improved sections
  const renderFormattedResult = () => {
    if (!result) return null;

    // Split the result into sections
    const sections = result.split(/(?=## )/);

    return (
      <div className="space-y-6">
        {sections.map((section, index) => {
          // Skip empty sections
          if (!section.trim()) return null;

          // Extract the section title
          const titleMatch = section.match(/^## (.+)/);
          const title = titleMatch ? titleMatch[1] : `Section ${index + 1}`;
          
          // Extract improved version if it exists
          const improvedVersionMatch = section.match(/### Improved Version:([\s\S]+?)(?=###|$)/);
          const improvedVersion = improvedVersionMatch 
            ? improvedVersionMatch[1].trim() 
            : null;

          return (
            <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: section }} />
              
              {improvedVersion && (
                <div className="mt-4">
                  <button
                    onClick={() => copyToClipboard(improvedVersion, title)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    {copiedSection === title ? "Copied!" : "Copy Improved Version"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-md bg-gray-50">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-gray-500">Analyzing your CV...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Analysis Results</h2>
      {result ? (
        renderFormattedResult()
      ) : (
        <p className="text-gray-500">Upload your CV and click "Analyze" to see results</p>
      )}
    </div>
  );
} 