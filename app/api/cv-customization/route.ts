// Set to Edge runtime for better performance
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { config, isProviderAvailable } from '../config';
import { ModelProvider } from '../../components/ModelSelector';
import { cvCustomizationResultSchema } from './schemas';

// Import utility functions
import { 
  logDebug, 
  getEnvironmentInfo, 
  getResponseHeaders
} from './utils';

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
} from './agents';

// Azure Static Web Apps has a 30-second limit for function execution
export const maxDuration = 230; // We set to 230 but Azure might enforce a lower limit

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const startTime = Date.now();
  
  try {
    logs.push(logDebug('Starting CV customization agent'));
    logs.push(logDebug('Environment info', getEnvironmentInfo()));
    
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

      if (!cvFile || !customerFiles.length) {
        logs.push(logDebug('Missing required parameters'));
        return NextResponse.json(
          { error: 'Missing required parameters (CV file or customer files)', logs },
          { status: 400, headers: getResponseHeaders() }
        );
      }

      // Check if the requested provider is available
      logs.push(logDebug(`Checking if provider is available: ${modelProvider}`));
      if (!isProviderAvailable(modelProvider)) {
        logs.push(logDebug(`API key not configured for provider: ${modelProvider}`));
        return NextResponse.json(
          { 
            error: `${modelProvider} API key is not configured`, 
            logs,
            environment: getEnvironmentInfo() 
          },
          { status: 400, headers: getResponseHeaders() }
        );
      }
      logs.push(logDebug(`Provider ${modelProvider} is available`));

      // Currently only supporting OpenAI models for agent-based analysis
      if (modelProvider !== 'openai') {
        logs.push(logDebug(`Unsupported provider for CV customization: ${modelProvider}`));
        return NextResponse.json(
          { error: 'CV customization currently only supports OpenAI models', logs },
          { status: 400, headers: getResponseHeaders() }
        );
      }

      // Read the CV file as ArrayBuffer
      logs.push(logDebug('Reading CV PDF file'));
      let cvBuffer;
      try {
        const cvArrayBuffer = await cvFile.arrayBuffer();
        cvBuffer = Buffer.from(cvArrayBuffer);
        logs.push(logDebug(`CV PDF file converted to buffer, size: ${cvBuffer.length} bytes`));
      } catch (fileError) {
        logs.push(logDebug('Error processing CV PDF file:', fileError));
        return NextResponse.json(
          { 
            error: 'Failed to process CV PDF file', 
            details: fileError instanceof Error ? fileError.message : 'Unknown file processing error',
            logs 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }
      
      // Read the customer files as ArrayBuffer
      logs.push(logDebug('Reading customer PDF files'));
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
        logs.push(logDebug(`Processed ${customerBuffers.length} customer files`));
      } catch (fileError) {
        logs.push(logDebug('Error processing customer PDF files:', fileError));
        return NextResponse.json(
          { 
            error: 'Failed to process customer PDF files', 
            details: fileError instanceof Error ? fileError.message : 'Unknown file processing error',
            logs 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }

      // Configure the provider
      logs.push(logDebug(`Setting OpenAI API key from config`));
      const openaiKeyBefore = !!process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = config.openai.apiKey;
      const openaiKeyAfter = !!process.env.OPENAI_API_KEY;
      logs.push(logDebug(`OpenAI key status: before=${openaiKeyBefore}, after=${openaiKeyAfter}, key_length=${config.openai.apiKey?.length || 0}`));
      
      if (!process.env.OPENAI_API_KEY) {
        logs.push(logDebug('OpenAI API key is not set after configuration attempt'));
        return NextResponse.json(
          { 
            error: 'OpenAI API key is not available', 
            logs, 
            environment: getEnvironmentInfo() 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }
      
      // Use OpenAI responses API for PDF support
      const model = openai.responses(modelName);
      logs.push(logDebug(`Configured OpenAI model with responses API: ${modelName}`));
      
      // Detect the language of the CV
      logs.push(logDebug('Detecting language of the CV'));
      let languageDetection;
      try {
        languageDetection = await runLanguageDetectionAgent({
          model: openai(modelName), // Using standard model for language detection
          fileBuffer: cvBuffer,
          fileName: cvFile.name
        });
        logs.push(logDebug(`Language detected: ${languageDetection.language} (${languageDetection.languageCode}) with ${languageDetection.confidence * 100}% confidence`));
      } catch (langError) {
        logs.push(logDebug('Error detecting language:', langError));
        return NextResponse.json(
          { 
            error: 'Failed to detect document language, possible API connection issue', 
            details: langError instanceof Error ? langError.message : 'Unknown language detection error',
            logs,
            timeTaken: `${(Date.now() - startTime) / 1000}s` 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }
      
      // Create language instruction to add to all system prompts
      const languageInstruction = `IMPORTANT: Provide all analysis, feedback, and suggestions in ${languageDetection.language} language to match the language of the CV.`;
      
      try {
        logs.push(logDebug('Starting CV customization process'));
        
        // Step 1: Analyze customer requirements using direct PDF processing
        logs.push(logDebug('Analyzing customer requirements with native PDF processing'));
        
        // Prepare customer documents as message content with proper typing
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
        
        logs.push(logDebug('Customer requirements analysis completed', {
          mustHaveCount: customerRequirements.must_have_requirements.length,
          shouldHaveCount: customerRequirements.should_have_requirements.length
        }));
        
        // Step 2: Customize the CV profile using direct PDF processing  
        logs.push(logDebug('Customizing CV profile'));
        const customizedProfile = await runProfileCustomizationAgent({
          model,
          cvBuffer,
          cvFileName: cvFile.name,
          customerRequirements,
          languageInstruction
        });
        
        console.log('👤 Profile Customization Results:', {
          originalLength: customizedProfile.original_profile.length,
          customizedLength: customizedProfile.customized_profile.length,
          lengthRatio: (customizedProfile.customized_profile.length / customizedProfile.original_profile.length).toFixed(2),
          originalPreview: customizedProfile.original_profile.substring(0, 200) + '...',
          customizedPreview: customizedProfile.customized_profile.substring(0, 200) + '...',
          reasoning: customizedProfile.reasoning.substring(0, 300) + '...'
        });
        
        logs.push(logDebug('Profile customization completed', {
          originalLength: customizedProfile.original_profile.length,
          customizedLength: customizedProfile.customized_profile.length,
          lengthRatio: (customizedProfile.customized_profile.length / customizedProfile.original_profile.length).toFixed(2)
        }));
        
        // Steps 3-4: Run competencies and projects customization in parallel
        logs.push(logDebug('Starting parallel customization of competencies and projects'));
        
        const [customizedCompetencies, customizedProjects] = await Promise.all([
          // Competencies customization
          (async () => {
            console.log('🎯 Starting competencies customization...');
            logs.push(logDebug('Customizing competencies with native PDF processing'));
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
            
            logs.push(logDebug('Competencies customization completed', {
              relevantCompetenciesCount: result.relevant_competencies.length,
              additionalSuggestionsCount: result.additional_suggested_competencies.length
            }));
            return result;
          })(),
          
          // Projects customization
          (async () => {
            console.log('📁 Starting projects customization...');
            logs.push(logDebug('Customizing project descriptions with native PDF processing'));
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
            
            logs.push(logDebug('Project customization completed', {
              projectsCount: result.length
            }));
            return result;
          })()
        ]);
        
        logs.push(logDebug('All parallel customizations completed successfully'));
        
        // Step 5: Evaluate the customized CV
        logs.push(logDebug('Evaluating customized CV against requirements'));
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
        
        logs.push(logDebug('CV evaluation completed', {
          overallScore: evaluation.overall_score,
          requirementCoverageCount: evaluation.requirement_coverage.length
        }));
        
        // Step 6: Validate the customized content against the original CV
        logs.push(logDebug('Validating customized content for factual accuracy'));
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
        
        logs.push(logDebug('Validation completed', {
          passesValidation: validation.overall_validation.passes_validation,
          confidenceScore: validation.overall_validation.confidence_score
        }));
        
        // Step 7: Correct the CV if validation fails
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
          logs.push(logDebug('Validation failed, running specialized correction agents'));
          
          // Run correction agents in parallel for different sections
          const [profileCorrection, competenciesCorrection, projectsCorrection] = await Promise.all([
            // Profile correction (only if profile has issues)
            !validation.profile_validation.is_factually_accurate ? 
              (async () => {
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
                
                return result;
              })() : null,
            
            // Competencies correction (only if competencies have issues)
            validation.competencies_validation.unsupported_competencies.length > 0 ?
              (async () => {
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
                
                return result;
              })() : null,
            
            // Projects correction (only if any project has issues)
            validation.projects_validation.some((p: any) => !p.is_factually_accurate) ?
              (async () => {
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
                
                return result;
              })() : null
          ]);
          
          console.log('🔧 Correction Summary:', {
            profileCorrected: !!profileCorrection,
            competenciesCorrected: !!competenciesCorrection,
            projectsCorrected: !!projectsCorrection,
            profileChanges: profileCorrection?.changes_made || [],
            competenciesRemoved: competenciesCorrection?.removed_competencies || [],
            projectsUpdated: projectsCorrection?.correction_summary.total_projects_corrected || 0
          });
          
          logs.push(logDebug('Specialized correction agents completed', {
            profileCorrected: !!profileCorrection,
            competenciesCorrected: !!competenciesCorrection,
            projectsCorrected: !!projectsCorrection
          }));
          
          // Build correction summary
          const totalIssuesFixed = 
            (profileCorrection ? 1 : 0) + 
            (competenciesCorrection ? competenciesCorrection.removed_competencies.length : 0) + 
            (projectsCorrection ? projectsCorrection.correction_summary.total_projects_corrected : 0);
          
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
              profile: customizedProfile.customized_profile, // Keep original if no correction needed
              changes_made: [],
              reasoning: 'No profile correction needed'
            },
            corrected_competencies: competenciesCorrection ? {
              competencies: competenciesCorrection.corrected_competencies,
              removed_competencies: competenciesCorrection.removed_competencies,
              reasoning: competenciesCorrection.reasoning
            } : {
              competencies: customizedCompetencies.relevant_competencies, // Keep original if no correction needed
              removed_competencies: [],
              reasoning: 'No competencies correction needed'
            },
            corrected_projects: projectsCorrection ? 
              projectsCorrection.corrected_projects.map((correctedProject, index) => ({
                project_name: correctedProject.project_name,
                corrected_description: correctedProject.corrected_description,
                parc_analysis: correctedProject.parc_analysis,
                changes_made: correctedProject.changes_made,
                reasoning: correctedProject.reasoning
              })) :
              customizedProjects.map(project => ({
                project_name: project.project_name,
                corrected_description: project.customized_description, // Keep original if no correction needed
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
          
          console.log('🔧 Final Correction Applied:', {
            originalProfileLength: customizedProfile.customized_profile.length,
            correctedProfileLength: correction.corrected_profile.profile.length,
            profileChanged: customizedProfile.customized_profile !== correction.corrected_profile.profile,
            profileChangesCount: correction.corrected_profile.changes_made.length,
            competenciesChanged: customizedCompetencies.relevant_competencies.length !== correction.corrected_competencies.competencies.length,
            projectsChanged: correction.corrected_projects.some((cp, i) => cp.corrected_description !== customizedProjects[i].customized_description)
          });
          
          logs.push(logDebug('Corrections applied to final result', {
            profileChanged: customizedProfile.customized_profile !== correction.corrected_profile.profile,
            competenciesChanged: customizedCompetencies.relevant_competencies.length !== correction.corrected_competencies.competencies.length
          }));
        } else {
          console.log('✅ Validation passed - no correction needed');
          logs.push(logDebug('Validation passed, no correction needed'));
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
        
        logs.push(logDebug('CV customization completed successfully', {
          timeTaken: `${(Date.now() - startTime) / 1000}s`
        }));
        
        // Validate the result against the schema
        const validatedResult = cvCustomizationResultSchema.parse(result);
        
        return NextResponse.json(
          { 
            result: validatedResult,
            logs,
            timeTaken: `${(Date.now() - startTime) / 1000}s` 
          },
          { headers: getResponseHeaders() }
        );
      } catch (error) {
        logs.push(logDebug('Error during CV customization:', error));
        return NextResponse.json(
          { 
            error: 'Failed to complete CV customization', 
            details: error instanceof Error ? error.message : 'Unknown error during customization',
            logs,
            timeTaken: `${(Date.now() - startTime) / 1000}s` 
          },
          { status: 500, headers: getResponseHeaders() }
        );
      }
    } catch (formDataError) {
      logs.push(logDebug('Error processing form data:', formDataError));
      return NextResponse.json(
        { 
          error: 'Failed to process request data', 
          details: formDataError instanceof Error ? formDataError.message : 'Unknown form data error',
          logs 
        },
        { status: 400, headers: getResponseHeaders() }
      );
    }
  } catch (error) {
    logs.push(logDebug('Unhandled error:', error));
    return NextResponse.json(
      { 
        error: 'Unhandled server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        logs 
      },
      { status: 500, headers: getResponseHeaders() }
    );
  }
} 