'use client';

import { useState, useEffect } from 'react';
import { 
  Card,
  Heading, 
  Paragraph, 
  Alert
} from '@digdir/designsystemet-react';

interface ProgressStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
  data?: any;
}

interface ProgressUpdate {
  step: string;
  status: 'starting' | 'completed' | 'error';
  message: string;
  data?: any;
  progress: number;
}

interface CVCustomizationProgressProps {
  isVisible: boolean;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
}

export default function CVCustomizationProgress({ 
  isVisible, 
  onComplete, 
  onError 
}: CVCustomizationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Initializing...');
  
  // Step weights based on complexity and expected duration (totaling 100%)
  const stepWeights: Record<string, number> = {
    'validation': 2,                    // Quick input validation
    'file_processing': 2,               // Quick file reading
    'language_detection': 3,            // Quick AI call
    'requirements_analysis': 6,         // Moderate AI processing
    'profile_customization': 12,        // Complex AI customization
    'competencies_customization': 10,   // Complex AI customization
    'projects_customization': 16,       // Heaviest - processes multiple projects
    'evaluation': 6,                    // Moderate AI evaluation
    'content_validation': 7,            // Moderate AI validation
    'profile_correction': 11,           // Complex AI correction
    'competencies_correction': 9,       // Complex AI correction
    'projects_correction': 14,          // Heavy - processes multiple projects
    'correction_check': 1,              // Quick check
    'complete': 1                       // Finalization
  };
  
  const [steps, setSteps] = useState<ProgressStep[]>([
    { id: 'validation', name: 'Input Validation', status: 'pending' },
    { id: 'file_processing', name: 'File Processing', status: 'pending' },
    { id: 'language_detection', name: 'Language Detection', status: 'pending' },
    { id: 'requirements_analysis', name: 'Requirements Analysis', status: 'pending' },
    { id: 'profile_customization', name: 'Profile Customization', status: 'pending' },
    { id: 'competencies_customization', name: 'Competencies Customization', status: 'pending' },
    { id: 'projects_customization', name: 'Projects Customization', status: 'pending' },
    { id: 'evaluation', name: 'CV Evaluation', status: 'pending' },
    { id: 'content_validation', name: 'Content Validation', status: 'pending' },
    { id: 'profile_correction', name: 'Profile Correction', status: 'pending' },
    { id: 'competencies_correction', name: 'Competencies Correction', status: 'pending' },
    { id: 'projects_correction', name: 'Projects Correction', status: 'pending' },
    { id: 'correction_check', name: 'Correction Check', status: 'pending' },
    { id: 'complete', name: 'Completion', status: 'pending' }
  ]);

  // Calculate weighted progress based on completed steps
  const calculateWeightedProgress = (currentSteps: ProgressStep[]) => {
    let totalProgress = 0;
    let currentStepProgress = 0;
    
    for (const step of currentSteps) {
      const weight = stepWeights[step.id] || 0;
      
      if (step.status === 'completed') {
        totalProgress += weight;
      } else if (step.status === 'running') {
        // Add partial progress for currently running step
        currentStepProgress = weight * 0.5; // Assume 50% progress for running step
        break;
      } else {
        // Once we hit a pending step, stop counting
        break;
      }
    }
    
    return Math.min(Math.round(totalProgress + currentStepProgress), 100);
  };

  useEffect(() => {
    if (!isVisible) return;

    // Reset state when starting
    setProgress(0);
    setCurrentMessage('Initializing...');
    setSteps(steps => steps.map(step => ({ ...step, status: 'pending' as const, message: undefined })));
  }, [isVisible]);

  const updateStep = (stepId: string, status: ProgressStep['status'], message?: string, data?: any) => {
    setSteps(prevSteps => {
      const newSteps = prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, status, message, data }
          : step
      );
      
      // Calculate and update weighted progress
      const weightedProgress = calculateWeightedProgress(newSteps);
      setProgress(weightedProgress);
      
      return newSteps;
    });
  };

  const handleProgressUpdate = (update: ProgressUpdate) => {
    // We no longer use the progress from the update, but calculate it based on step weights
    setCurrentMessage(update.message);

    // Update the specific step
    if (update.status === 'starting') {
      updateStep(update.step, 'running', update.message, update.data);
    } else if (update.status === 'completed') {
      updateStep(update.step, 'completed', update.message, update.data);
    } else if (update.status === 'error') {
      updateStep(update.step, 'error', update.message, update.data);
      onError(update.message);
    }

    // Handle completion
    if (update.step === 'complete' && update.data) {
      setProgress(100); // Ensure we hit 100% on completion
      onComplete(update.data);
    }
  };

  // Expose the update function for the parent component to use
  useEffect(() => {
    // Store the handler on the window object so the parent can access it
    (window as any).handleProgressUpdate = handleProgressUpdate;
    
    return () => {
      delete (window as any).handleProgressUpdate;
    };
  }, [onComplete, onError]);

  if (!isVisible) return null;

  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-500 text-lg">✓</span>;
      case 'running':
        return <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>;
      case 'error':
        return <span className="text-red-500 text-lg">✗</span>;
      default:
        return <span className="text-gray-300 text-lg">○</span>;
    }
  };

  const getStepStatusColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700';
      case 'running':
        return 'text-blue-700';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card>
      <Card.Block>
        <Heading level={3} data-size="sm">CV Customization Progress</Heading>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <Paragraph data-size="sm">{currentMessage}</Paragraph>
            <span className="text-sm font-medium text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Steps List */}
        <div className="mt-6 space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {getStepIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${getStepStatusColor(step.status)}`}>
                  {step.name}
                </div>
                {step.message && (
                  <div className="text-xs text-gray-500 mt-1">
                    {step.message}
                  </div>
                )}
                {step.data && step.status === 'completed' && (
                  <div className="text-xs text-gray-400 mt-1">
                    {/* Display specific data based on step */}
                    {step.id === 'language_detection' && step.data.language && (
                      `Language: ${step.data.language} (${Math.round(step.data.confidence * 100)}% confidence)`
                    )}
                    {step.id === 'requirements_analysis' && (
                      `${step.data.mustHaveCount} must-have, ${step.data.shouldHaveCount} should-have requirements`
                    )}
                    {step.id === 'competencies_customization' && step.data.relevantCount && (
                      `${step.data.relevantCount} relevant competencies identified`
                    )}
                    {step.id === 'projects_customization' && step.data.projectsCount && (
                      `${step.data.projectsCount} projects customized`
                    )}
                    {step.id === 'evaluation' && step.data.overallScore && (
                      `Overall score: ${step.data.overallScore}/10`
                    )}
                    {step.id === 'content_validation' && step.data && (
                      `${step.data.passes ? 'Passed' : 'Failed'} (confidence: ${(step.data.confidence * 10).toFixed(1)}/10)`
                    )}
                    {step.id === 'profile_correction' && step.data && (
                      `${step.data.changesMade} changes made (confidence: ${(step.data.confidence * 10).toFixed(1)}/10)`
                    )}
                    {step.id === 'competencies_correction' && step.data && (
                      `${step.data.removedCount} items removed (confidence: ${(step.data.confidence * 10).toFixed(1)}/10)`
                    )}
                    {step.id === 'projects_correction' && step.data && (
                      `${step.data.projectsCorrected} projects updated (confidence: ${(step.data.confidence * 10).toFixed(1)}/10)`
                    )}
                    {step.id === 'correction_check' && step.status === 'completed' && (
                      'No correction needed'
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card.Block>
    </Card>
  );
} 