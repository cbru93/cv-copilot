// Set to Edge runtime for better performance
export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { config, isProviderAvailable } from '../../config';
import { ModelProvider } from '../../../components/ModelSelector';

// Import utility functions
import { 
  logDebug, 
  getEnvironmentInfo
} from '../utils';

// Import agents
import {
  runRequirementsAnalysisAgent,
  runProfileCustomizationAgent,
  runCompetenciesCustomizationAgent,
  runProjectsCustomizationAgent,
  runEvaluationAgent,
  runValidationAgent,
  runProfileCorrectionAgent,
  runCompetenciesCorrectionAgent,
  runProjectsCorrectionAgent,
  runLanguageDetectionAgent
} from '../agents';

// Azure Static Web Apps has a 30-second limit for function execution
export const maxDuration = 230;

interface ProgressUpdate {
  step: string;
  status: 'starting' | 'completed' | 'error' | 'running';
  message: string;
  data?: any;
  progress: number; // 0-100
}

function createProgressUpdate(step: string, status: ProgressUpdate['status'], message: string, data?: any, progress: number = 0): string {
  const update: ProgressUpdate = { step, status, message, data, progress };
  return `data: ${JSON.stringify(update)}\n\n`;
}

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const startTime = Date.now();
  
  // Create a readable stream for Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected","message":"Starting CV customization process"}\n\n'));
    },
    
    async pull(controller) {
      try {
        logs.push(logDebug('Starting CV customization agent'));
        
        try {
          const formData = await req.formData();
          const cvFile = formData.get('cvFile') as File;
          const customerFiles = formData.getAll('customerFiles') as File[];
          const modelProvider = formData.get('modelProvider') as ModelProvider;
          const modelName = formData.get('modelName') as string;

          logs.push(logDebug(`Request parameters received`, { 
            cvFileSize: cvFile ? cvFile.size : 'No file',
            cvFileName: cvFile ? cvFile.name : 'No file',
            customerFilesCount: customerFiles?.length || 0,
            modelProvider, 
            modelName
          }));

          // Send progress update
          controller.enqueue(encoder.encode(createProgressUpdate(
            'validation', 'starting', 'Validating input parameters...', null, 5
          )));

          if (!cvFile || !customerFiles.length) {
            controller.enqueue(encoder.encode(createProgressUpdate(
              'validation', 'error', 'Missing required parameters (CV file or customer files)', null, 0
            )));
            controller.close();
            return;
          }

          // Check if the requested provider is available
          if (!isProviderAvailable(modelProvider)) {
            controller.enqueue(encoder.encode(createProgressUpdate(
              'validation', 'error', `${modelProvider} API key is not configured`, null, 0
            )));
            controller.close();
            return;
          }

          // Currently only supporting OpenAI models for agent-based analysis
          if (modelProvider !== 'openai') {
            controller.enqueue(encoder.encode(createProgressUpdate(
              'validation', 'error', 'CV customization currently only supports OpenAI models', null, 0
            )));
            controller.close();
            return;
          }

          controller.enqueue(encoder.encode(createProgressUpdate(
            'validation', 'completed', 'Input validation completed successfully', null, 10
          )));

          // Read the CV file as ArrayBuffer
          controller.enqueue(encoder.encode(createProgressUpdate(
            'file_processing', 'starting', 'Processing CV and customer files...', null, 15
          )));
          
          let cvBuffer;
          try {
            const cvArrayBuffer = await cvFile.arrayBuffer();
            cvBuffer = Buffer.from(cvArrayBuffer);
          } catch (fileError) {
            controller.enqueue(encoder.encode(createProgressUpdate(
              'file_processing', 'error', 'Failed to process CV PDF file', null, 0
            )));
            controller.close();
            return;
          }
          
          // Read the customer files as ArrayBuffer
          let customerBuffers = [];
          try {
            for (const file of customerFiles) {
              const arrayBuffer = await file.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              customerBuffers.push({
                name: file.name,
                buffer: buffer
              });
            }
          } catch (fileError) {
            controller.enqueue(encoder.encode(createProgressUpdate(
              'file_processing', 'error', 'Failed to process customer PDF files', null, 0
            )));
            controller.close();
            return;
          }

          controller.enqueue(encoder.encode(createProgressUpdate(
            'file_processing', 'completed', `Successfully processed ${customerBuffers.length} customer files and CV`, null, 20
          )));

          // Configure the provider
          process.env.OPENAI_API_KEY = config.openai.apiKey;
          
          if (!process.env.OPENAI_API_KEY) {
            controller.enqueue(encoder.encode(createProgressUpdate(
              'configuration', 'error', 'OpenAI API key is not available', null, 0
            )));
            controller.close();
            return;
          }
          
          // Use OpenAI responses API for PDF support
          const model = openai.responses(modelName);
          
          // Detect the language of the CV
          controller.enqueue(encoder.encode(createProgressUpdate(
            'language_detection', 'starting', 'Detecting document language...', null, 25
          )));
          
          let languageDetection;
          try {
            languageDetection = await runLanguageDetectionAgent({
              model: openai(modelName),
              fileBuffer: cvBuffer,
              fileName: cvFile.name
            });
            
            controller.enqueue(encoder.encode(createProgressUpdate(
              'language_detection', 'completed', 
              `Detected language: ${languageDetection.language} (${languageDetection.confidence * 100}% confidence)`, 
              { language: languageDetection.language, confidence: languageDetection.confidence }, 
              30
            )));
          } catch (langError) {
            controller.enqueue(encoder.encode(createProgressUpdate(
              'language_detection', 'error', 'Failed to detect document language', null, 0
            )));
            controller.close();
            return;
          }
          
          // Create language instruction to add to all system prompts
          const languageInstruction = `IMPORTANT: Provide all analysis, feedback, and suggestions in ${languageDetection.language} language to match the language of the CV.`;
          
          try {
            // Step 1: Analyze customer requirements
            controller.enqueue(encoder.encode(createProgressUpdate(
              'requirements_analysis', 'starting', 'Analyzing customer requirements...', null, 35
            )));
            
            const customerDocsContent = [
              {
                type: 'text' as const,
                text: 'Please analyze these customer documents and extract all requirements:'
              } as const,
              ...customerBuffers.map(file => ({
                type: 'file' as const,
                data: file.buffer,
                mimeType: 'application/pdf',
                filename: file.name
              }))
            ];
            
            const customerRequirements = await runRequirementsAnalysisAgent({
              model,
              customerDocsContent,
              languageInstruction
            });
            
            console.log('📋 Customer Requirements Analysis Results:', {
              mustHaveCount: customerRequirements.must_have_requirements.length,
              shouldHaveCount: customerRequirements.should_have_requirements.length,
              mustHaveRequirements: customerRequirements.must_have_requirements.map(r => r.requirement),
              shouldHaveRequirements: customerRequirements.should_have_requirements.map(r => r.requirement),
              contextSummary: customerRequirements.context_summary
            });
            
            controller.enqueue(encoder.encode(createProgressUpdate(
              'requirements_analysis', 'completed', 
              `Found ${customerRequirements.must_have_requirements.length} must-have and ${customerRequirements.should_have_requirements.length} should-have requirements`, 
              { 
                mustHaveCount: customerRequirements.must_have_requirements.length,
                shouldHaveCount: customerRequirements.should_have_requirements.length 
              }, 
              45
            )));
            
            // Steps 2-4: Run customizations in parallel
            controller.enqueue(encoder.encode(createProgressUpdate(
              'customization', 'starting', 'Customizing CV profile, competencies, and projects...', null, 50
            )));
            
            const [customizedProfile, customizedCompetencies, customizedProjects] = await Promise.all([
              // Profile customization
              (async () => {
                console.log('👤 Starting profile customization...');
                const result = await runProfileCustomizationAgent({
                  model,
                  cvBuffer,
                  cvFileName: cvFile.name,
                  customerRequirements,
                  languageInstruction
                });
                
                console.log('👤 Profile Customization Results:', {
                  originalLength: result.original_profile.length,
                  customizedLength: result.customized_profile.length,
                  reasoning: result.reasoning.substring(0, 200) + '...'
                });
                
                controller.enqueue(encoder.encode(createProgressUpdate(
                  'profile_customization', 'completed', 'CV profile customization completed', null, 60
                )));
                
                return result;
              })(),
              
              // Competencies customization
              (async () => {
                console.log('🎯 Starting competencies customization...');
                const result = await runCompetenciesCustomizationAgent({
                  model,
                  cvBuffer,
                  cvFileName: cvFile.name,
                  customerRequirements,
                  languageInstruction
                });
                
                console.log('🎯 Competencies Customization Results:', {
                  originalCount: result.original_competencies.length,
                  relevantCount: result.relevant_competencies.length,
                  additionalSuggestionsCount: result.additional_suggested_competencies.length,
                  relevantCompetencies: result.relevant_competencies,
                  additionalSuggestions: result.additional_suggested_competencies
                });
                
                controller.enqueue(encoder.encode(createProgressUpdate(
                  'competencies_customization', 'completed', 
                  `Identified ${result.relevant_competencies.length} relevant competencies`, 
                  { relevantCount: result.relevant_competencies.length }, 
                  65
                )));
                
                return result;
              })(),
              
              // Projects customization
              (async () => {
                console.log('📁 Starting projects customization...');
                const result = await runProjectsCustomizationAgent({
                  model,
                  cvBuffer,
                  cvFileName: cvFile.name,
                  customerRequirements,
                  languageInstruction
                });
                
                console.log('📁 Projects Customization Results:', {
                  projectsCount: result.length,
                  projects: result.map(p => ({
                    name: p.project_name,
                    relevanceScore: p.relevance_score,
                    originalDescLength: p.original_description.length,
                    customizedDescLength: p.customized_description.length
                  }))
                });
                
                controller.enqueue(encoder.encode(createProgressUpdate(
                  'projects_customization', 'completed', 
                  `Customized ${result.length} project descriptions`, 
                  { projectsCount: result.length }, 
                  70
                )));
                
                return result;
              })()
            ]);
            
            controller.enqueue(encoder.encode(createProgressUpdate(
              'customization', 'completed', 'All customization tasks completed successfully', null, 75
            )));
            
            // Step 5: Evaluate the customized CV
            controller.enqueue(encoder.encode(createProgressUpdate(
              'evaluation', 'starting', 'Evaluating customized CV against requirements...', null, 80
            )));
            
            const evaluation = await runEvaluationAgent({
              model,
              customizedProfile,
              keyCompetencies: customizedCompetencies,
              customizedProjects,
              customerRequirements,
              languageInstruction
            });
            
            console.log('📊 Evaluation Results:', {
              overallScore: evaluation.overall_score,
              requirementCoverageCount: evaluation.requirement_coverage.length,
              requirementCoverage: evaluation.requirement_coverage.map(r => ({
                requirement: r.requirement,
                covered: r.covered,
                details: r.coverage_details.substring(0, 100) + '...'
              })),
              overallComments: evaluation.overall_comments.substring(0, 200) + '...',
              improvementSuggestions: evaluation.improvement_suggestions
            });
            
            controller.enqueue(encoder.encode(createProgressUpdate(
              'evaluation', 'completed', 
              `Evaluation completed with overall score: ${evaluation.overall_score}/10`, 
              { overallScore: evaluation.overall_score }, 
              85
            )));
            
            // Step 6: Validate the customized content
            controller.enqueue(encoder.encode(createProgressUpdate(
              'content_validation', 'starting', 'Validating content for factual accuracy...', null, 90
            )));
            
            const validation = await runValidationAgent({
              model,
              cvBuffer,
              cvFileName: cvFile.name,
              originalProfile: customizedProfile.original_profile,
              customizedProfile: customizedProfile.customized_profile,
              originalCompetencies: customizedCompetencies.original_competencies,
              customizedCompetencies: customizedCompetencies.relevant_competencies,
              customizedProjects,
              languageInstruction
            });
            
            console.log('🔍 Validation Results:', {
              passesValidation: validation.overall_validation.passes_validation,
              confidenceScore: validation.overall_validation.confidence_score,
              profileValid: validation.profile_validation.is_factually_accurate,
              profileFabricatedClaims: validation.profile_validation.fabricated_claims,
              profileUnsupportedClaims: validation.profile_validation.unsupported_claims,
              competenciesUnsupported: validation.competencies_validation.unsupported_competencies,
              projectsWithIssues: validation.projects_validation.filter(p => !p.is_factually_accurate).map(p => ({
                name: p.project_name,
                fabricatedDetails: p.fabricated_details,
                unsupportedClaims: p.unsupported_claims
              }))
            });
            
            const validationStatus = validation.overall_validation.passes_validation ? 'passed' : 'failed';
            controller.enqueue(encoder.encode(createProgressUpdate(
              'content_validation', 'completed', 
              `Content validation ${validationStatus} (confidence: ${validation.overall_validation.confidence_score}/10)`, 
              { 
                passes: validation.overall_validation.passes_validation, 
                confidence: validation.overall_validation.confidence_score 
              }, 
              90
            )));
            
            // Step 7: Correct the content if validation fails
            let finalResult = {
              customer_requirements: customerRequirements,
              profile_customization: customizedProfile,
              key_competencies: customizedCompetencies,
              customized_projects: customizedProjects,
              evaluation: evaluation,
              validation: validation,
              language_code: languageDetection.languageCode,
              correction: null as any
            };
            
            if (!validation.overall_validation.passes_validation) {
              console.log('⚠️ Validation failed - starting correction process...');
              
              // Run correction agents in parallel for different sections
              const correctionPromises = [];
              let profileCorrectionPromise = null;
              let competenciesCorrectionPromise = null;
              let projectsCorrectionPromise = null;
              
              // Profile correction (only if profile has issues)
              if (!validation.profile_validation.is_factually_accurate) {
                controller.enqueue(encoder.encode(createProgressUpdate(
                  'profile_correction', 'starting', 
                  'Correcting profile validation issues...', 
                  null, 
                  92
                )));
                
                profileCorrectionPromise = (async () => {
                  console.log('👤🔧 Starting profile correction...');
                  const result = await runProfileCorrectionAgent({
                    model,
                    cvBuffer,
                    cvFileName: cvFile.name,
                    originalProfile: customizedProfile.original_profile,
                    customizedProfile: customizedProfile.customized_profile,
                    profileValidation: validation.profile_validation,
                    customerRequirements,
                    languageInstruction
                  });
                  
                  console.log('👤🔧 Profile Correction Results:', {
                    originalLength: customizedProfile.customized_profile.length,
                    correctedLength: result.corrected_profile.length,
                    changesMade: result.changes_made,
                    preservedCustomizations: result.preserved_customizations,
                    confidenceScore: result.confidence_score
                  });
                  
                  controller.enqueue(encoder.encode(createProgressUpdate(
                    'profile_correction', 'completed', 
                    `Profile corrected - ${result.changes_made.length} changes made`, 
                    { changesMade: result.changes_made.length, confidence: result.confidence_score }, 
                    94
                  )));
                  
                  return result;
                })();
                correctionPromises.push(profileCorrectionPromise);
              } else {
                console.log('👤✅ Profile validation passed - no correction needed');
              }
              
              // Competencies correction (only if competencies have issues)
              if (validation.competencies_validation.unsupported_competencies.length > 0) {
                controller.enqueue(encoder.encode(createProgressUpdate(
                  'competencies_correction', 'starting', 
                  'Correcting competencies validation issues...', 
                  null, 
                  93
                )));
                
                competenciesCorrectionPromise = (async () => {
                  console.log('🎯🔧 Starting competencies correction...');
                  const result = await runCompetenciesCorrectionAgent({
                    model,
                    cvBuffer,
                    cvFileName: cvFile.name,
                    originalCompetencies: customizedCompetencies.original_competencies,
                    customizedCompetencies: customizedCompetencies.relevant_competencies,
                    competenciesValidation: validation.competencies_validation,
                    customerRequirements,
                    languageInstruction
                  });
                  
                  console.log('🎯🔧 Competencies Correction Results:', {
                    originalCount: customizedCompetencies.relevant_competencies.length,
                    correctedCount: result.corrected_competencies.length,
                    removedCount: result.removed_competencies.length,
                    removedCompetencies: result.removed_competencies,
                    preservedCompetencies: result.preserved_competencies,
                    confidenceScore: result.confidence_score
                  });
                  
                  controller.enqueue(encoder.encode(createProgressUpdate(
                    'competencies_correction', 'completed', 
                    `Competencies corrected - ${result.removed_competencies.length} unsupported items removed`, 
                    { removedCount: result.removed_competencies.length, confidence: result.confidence_score }, 
                    95
                  )));
                  
                  return result;
                })();
                correctionPromises.push(competenciesCorrectionPromise);
              } else {
                console.log('🎯✅ Competencies validation passed - no correction needed');
              }
              
              // Projects correction (only if any project has issues)
              if (validation.projects_validation.some((p: any) => !p.is_factually_accurate)) {
                controller.enqueue(encoder.encode(createProgressUpdate(
                  'projects_correction', 'starting', 
                  'Correcting projects validation issues...', 
                  null, 
                  94
                )));
                
                projectsCorrectionPromise = (async () => {
                  console.log('📁🔧 Starting projects correction...');
                  const result = await runProjectsCorrectionAgent({
                    model,
                    cvBuffer,
                    cvFileName: cvFile.name,
                    customizedProjects,
                    projectsValidation: validation.projects_validation,
                    customerRequirements,
                    languageInstruction
                  });
                  
                  console.log('📁🔧 Projects Correction Results:', {
                    totalProjectsCorrected: result.correction_summary.total_projects_corrected,
                    majorCorrections: result.correction_summary.major_corrections,
                    confidenceScore: result.correction_summary.confidence_score,
                    correctedProjects: result.corrected_projects.map(p => ({
                      name: p.project_name,
                      changesMade: p.changes_made,
                      preservedElements: p.preserved_elements
                    }))
                  });
                  
                  controller.enqueue(encoder.encode(createProgressUpdate(
                    'projects_correction', 'completed', 
                    `Projects corrected - ${result.correction_summary.total_projects_corrected} projects updated`, 
                    { projectsCorrected: result.correction_summary.total_projects_corrected, confidence: result.correction_summary.confidence_score }, 
                    96
                  )));
                  
                  return result;
                })();
                correctionPromises.push(projectsCorrectionPromise);
              } else {
                console.log('📁✅ Projects validation passed - no correction needed');
              }
              
              // Wait for all correction promises to complete
              const [profileCorrection, competenciesCorrection, projectsCorrection] = await Promise.all([
                profileCorrectionPromise,
                competenciesCorrectionPromise,
                projectsCorrectionPromise
              ]);
              
              // Build correction summary
              const totalIssuesFixed = 
                (profileCorrection ? 1 : 0) + 
                (competenciesCorrection ? competenciesCorrection.removed_competencies.length : 0) + 
                (projectsCorrection ? projectsCorrection.correction_summary.total_projects_corrected : 0);
              
              console.log('🔧 Correction Summary:', {
                totalIssuesFixed,
                profileCorrected: !!profileCorrection,
                competenciesCorrected: !!competenciesCorrection,
                projectsCorrected: !!projectsCorrection,
                profileChanges: profileCorrection?.changes_made || [],
                competenciesRemoved: competenciesCorrection?.removed_competencies || [],
                projectsUpdated: projectsCorrection?.correction_summary.total_projects_corrected || 0
              });
              
              const majorChanges = [
                ...(profileCorrection ? profileCorrection.changes_made : []),
                ...(competenciesCorrection ? [`Removed ${competenciesCorrection.removed_competencies.length} unsupported competencies`] : []),
                ...(projectsCorrection ? projectsCorrection.correction_summary.major_corrections : [])
              ];
              
              const qualityImprovements = [
                ...(profileCorrection ? profileCorrection.preserved_customizations : []),
                ...(competenciesCorrection ? competenciesCorrection.preserved_competencies.map(c => `Preserved relevant competency: ${c}`) : []),
                ...(projectsCorrection ? projectsCorrection.corrected_projects.flatMap(p => p.preserved_elements.map(e => `Preserved in ${p.project_name}: ${e}`)) : [])
              ];
              
              // Create combined correction result
              const correction = {
                corrected_profile: profileCorrection ? {
                  profile: profileCorrection.corrected_profile,
                  changes_made: profileCorrection.changes_made,
                  reasoning: profileCorrection.reasoning
                } : {
                  profile: customizedProfile.customized_profile,
                  changes_made: [],
                  reasoning: 'No profile correction needed'
                },
                corrected_competencies: competenciesCorrection ? {
                  competencies: competenciesCorrection.corrected_competencies,
                  removed_competencies: competenciesCorrection.removed_competencies,
                  reasoning: competenciesCorrection.reasoning
                } : {
                  competencies: customizedCompetencies.relevant_competencies,
                  removed_competencies: [],
                  reasoning: 'No competencies correction needed'
                },
                corrected_projects: projectsCorrection ? 
                  projectsCorrection.corrected_projects.map((correctedProject) => ({
                    project_name: correctedProject.project_name,
                    corrected_description: correctedProject.corrected_description,
                    parc_analysis: correctedProject.parc_analysis,
                    changes_made: correctedProject.changes_made,
                    reasoning: correctedProject.reasoning
                  })) :
                  customizedProjects.map(project => ({
                    project_name: project.project_name,
                    corrected_description: project.customized_description,
                    parc_analysis: project.parc_analysis,
                    changes_made: [],
                    reasoning: 'No project correction needed'
                  })),
                correction_summary: {
                  total_issues_fixed: totalIssuesFixed,
                  major_changes: majorChanges,
                  quality_improvements: qualityImprovements,
                  confidence_score: Math.min(
                    profileCorrection?.confidence_score || 10,
                    competenciesCorrection?.confidence_score || 10,
                    projectsCorrection?.correction_summary.confidence_score || 10
                  )
                }
              };
              
              controller.enqueue(encoder.encode(createProgressUpdate(
                'content_correction', 'completed', 
                `Content correction completed - ${totalIssuesFixed} issues fixed`, 
                { 
                  issuesFixed: totalIssuesFixed, 
                  confidence: correction.correction_summary.confidence_score 
                }, 
                95
              )));
              
              // Update the final result with corrected content
              finalResult.profile_customization = {
                ...customizedProfile,
                customized_profile: correction.corrected_profile.profile
              };
              
              finalResult.key_competencies = {
                ...customizedCompetencies,
                relevant_competencies: correction.corrected_competencies.competencies
              };
              
              finalResult.customized_projects = correction.corrected_projects.map((correctedProject, index) => ({
                ...customizedProjects[index],
                customized_description: correctedProject.corrected_description,
                parc_analysis: correctedProject.parc_analysis
              }));
              
              finalResult.correction = correction;
            } else {
              console.log('✅ Validation passed - no correction needed');
              controller.enqueue(encoder.encode(createProgressUpdate(
                'correction_check', 'completed', 'No correction needed - validation passed', null, 97
              )));
            }
            
            // Prepare the final result
            const result = finalResult;
            
            console.log('🎉 CV Customization Completed Successfully!', {
              timeTaken: `${(Date.now() - startTime) / 1000}s`,
              hasCorrection: !!result.correction,
              finalOverallScore: result.evaluation.overall_score,
              languageDetected: result.language_code,
              totalStepsCompleted: result.correction ? 'All steps including correction' : 'All steps without correction needed'
            });
            
            // Send final result
            controller.enqueue(encoder.encode(createProgressUpdate(
              'complete', 'completed', 
              'CV customization completed successfully!', 
              result, 
              100
            )));
            
            // Close the stream
            controller.close();
            
          } catch (error) {
            logs.push(logDebug('Error during CV customization:', error));
            controller.enqueue(encoder.encode(createProgressUpdate(
              'error', 'error', 
              error instanceof Error ? error.message : 'Unknown error during customization', 
              { logs, timeTaken: `${(Date.now() - startTime) / 1000}s` }, 
              0
            )));
            controller.close();
          }
        } catch (formDataError) {
          controller.enqueue(encoder.encode(createProgressUpdate(
            'error', 'error', 
            'Failed to process request data', 
            null, 
            0
          )));
          controller.close();
        }
      } catch (error) {
        controller.enqueue(encoder.encode(createProgressUpdate(
          'error', 'error', 
          'Unhandled server error', 
          null, 
          0
        )));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 