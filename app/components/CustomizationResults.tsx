'use client';

import { useState } from 'react';
import { 
  Card,
  Heading, 
  Paragraph, 
  Table,
  Tag,
  Divider,
  Tabs
} from '@digdir/designsystemet-react';

type TabValue = 'requirements' | 'profile' | 'competencies' | 'projects' | 'evaluation' | 'validation' | 'correction';

interface CustomizationResultsProps {
  result: any;
  isLoading: boolean;
}

export default function CustomizationResults({ 
  result, 
  isLoading 
}: CustomizationResultsProps) {
  // Determine the default tab based on validation results
  const getDefaultTab = (): TabValue => {
    if (result?.correction) {
      return 'correction';
    }
    if (result?.validation && !result.validation.overall_validation.passes_validation) {
      return 'validation';
    }
    return 'requirements';
  };
  
  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <Paragraph>Processing your files...</Paragraph>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }
  
  if (!result || Object.keys(result).length === 0) {
    return (
      <div className="p-6 text-center">
        <Paragraph>Upload your CV and customer requirements to get started.</Paragraph>
      </div>
    );
  }
  
  const {
    customer_requirements,
    profile_customization,
    key_competencies,
    customized_projects,
    evaluation,
    validation,
    correction
  } = result;
  
  return (
    <div>
      {/* Validation/Correction Banner */}
      {correction && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <Heading level={4} data-size="xs" className="text-green-800">Content Automatically Corrected</Heading>
              <Paragraph className="text-green-700">
                {correction.correction_summary.total_issues_fixed} validation issues were automatically fixed to ensure factual accuracy.
                Review the Correction tab to see what was changed.
              </Paragraph>
            </div>
          </div>
        </div>
      )}
      
      {validation && !validation.overall_validation.passes_validation && !correction && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <Heading level={4} data-size="xs" className="text-red-800">Validation Issues Detected</Heading>
              <Paragraph className="text-red-700">
                The customized content contains potential fabricated or unsupported claims. 
                Please review the Validation tab for details.
              </Paragraph>
            </div>
          </div>
        </div>
      )}
      
      <Tabs defaultValue={getDefaultTab()}>
        <Tabs.List>
          <Tabs.Tab value="requirements">Requirements Analysis</Tabs.Tab>
          <Tabs.Tab value="profile">Profile Customization</Tabs.Tab>
          <Tabs.Tab value="competencies">Key Competencies</Tabs.Tab>
          <Tabs.Tab value="projects">Project Highlights</Tabs.Tab>
          <Tabs.Tab value="evaluation">Evaluation</Tabs.Tab>
          <Tabs.Tab value="validation">
            Validation
            {validation && (
              <span className="ml-2">
                {validation.overall_validation.passes_validation ? (
                  <span className="text-green-500">✓</span>
                ) : (
                  <span className="text-red-500">⚠</span>
                )}
              </span>
            )}
          </Tabs.Tab>
          {correction && (
            <Tabs.Tab value="correction">
              Correction
              <span className="ml-2">
                <span className="text-green-500">✓</span>
              </span>
            </Tabs.Tab>
          )}
        </Tabs.List>
        
        <Tabs.Panel value="requirements">
          <Card>
            <Card.Block>
              <Heading level={3} data-size="sm">Customer Requirements Analysis</Heading>
              <Paragraph className="mt-2">{customer_requirements.context_summary}</Paragraph>
            </Card.Block>
            
            <Card.Block>
              <Heading level={4} data-size="xs" className="mb-2">Must-Have Requirements</Heading>
              <Table>
                <Table.Head>
                  <Table.Row>
                    <Table.Cell>Requirement</Table.Cell>
                    <Table.Cell>Description</Table.Cell>
                    <Table.Cell>Priority</Table.Cell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {customer_requirements.must_have_requirements.map((req: any, index: number) => (
                    <Table.Row key={`must-${index}`}>
                      <Table.Cell>{req.requirement}</Table.Cell>
                      <Table.Cell>{req.description}</Table.Cell>
                      <Table.Cell>
                        <Tag data-color={req.priority === 'High' ? 'danger' : req.priority === 'Medium' ? 'warning' : 'success'}>
                          {req.priority}
                        </Tag>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Card.Block>
            
            <Card.Block>
              <Heading level={4} data-size="xs" className="mb-2">Should-Have Requirements</Heading>
              <Table>
                <Table.Head>
                  <Table.Row>
                    <Table.Cell>Requirement</Table.Cell>
                    <Table.Cell>Description</Table.Cell>
                    <Table.Cell>Priority</Table.Cell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {customer_requirements.should_have_requirements.map((req: any, index: number) => (
                    <Table.Row key={`should-${index}`}>
                      <Table.Cell>{req.requirement}</Table.Cell>
                      <Table.Cell>{req.description}</Table.Cell>
                      <Table.Cell>
                        <Tag data-color={req.priority === 'High' ? 'danger' : req.priority === 'Medium' ? 'warning' : 'success'}>
                          {req.priority}
                        </Tag>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Card.Block>
          </Card>
        </Tabs.Panel>
        
        <Tabs.Panel value="profile">
          <Card>
            <Card.Block>
              <Heading level={3} data-size="sm">Profile Customization</Heading>
              
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <Heading level={4} data-size="xs">Original Profile</Heading>
                <Paragraph className="mt-2 whitespace-pre-wrap">{profile_customization.original_profile}</Paragraph>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                <Heading level={4} data-size="xs">
                  {correction ? 'Initial Customized Profile' : 'Customized Profile'}
                </Heading>
                <Paragraph className="mt-2 whitespace-pre-wrap">{profile_customization.customized_profile}</Paragraph>
              </div>
              
              {correction && (
                <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
                  <Heading level={4} data-size="xs" className="text-green-800">Final Corrected Profile</Heading>
                  <Paragraph className="mt-2 whitespace-pre-wrap text-green-700">{correction.corrected_profile.profile}</Paragraph>
                  
                  {correction.corrected_profile.changes_made.length > 0 && (
                    <div className="mt-4">
                      <Heading level={5} data-size="xs" className="text-green-800">Changes Made</Heading>
                      <ul className="mt-2 list-disc pl-6 text-green-700">
                        {correction.corrected_profile.changes_made.map((change: string, index: number) => (
                          <li key={`change-${index}`} className="mb-1">{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4">
                <Heading level={4} data-size="xs">Reasoning</Heading>
                <Paragraph className="mt-2 whitespace-pre-wrap">{profile_customization.reasoning}</Paragraph>
              </div>
            </Card.Block>
          </Card>
        </Tabs.Panel>
        
        <Tabs.Panel value="competencies">
          <Card>
            <Card.Block>
              <Heading level={3} data-size="sm">Key Competencies</Heading>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-gray-50 rounded">
                  <Heading level={4} data-size="xs">Original Competencies</Heading>
                  <ul className="mt-2 list-disc pl-6">
                    {key_competencies.original_competencies.map((comp: string, index: number) => (
                      <li key={`orig-${index}`} className="mb-1">{comp}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <Heading level={4} data-size="xs">
                    {correction ? 'Initial Customized Competencies' : 'Relevant Competencies'}
                  </Heading>
                  <ul className="mt-2 list-disc pl-6">
                    {key_competencies.relevant_competencies.map((comp: string, index: number) => (
                      <li key={`rel-${index}`} className="mb-1">{comp}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {correction && (
                <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
                  <Heading level={4} data-size="xs" className="text-green-800">Final Corrected Competencies</Heading>
                  <ul className="mt-2 list-disc pl-6 text-green-700">
                    {correction.corrected_competencies.competencies.map((comp: string, index: number) => (
                      <li key={`corr-comp-${index}`} className="mb-1">{comp}</li>
                    ))}
                  </ul>
                  
                  {correction.corrected_competencies.removed_competencies.length > 0 && (
                    <div className="mt-4">
                      <Heading level={5} data-size="xs" className="text-red-800">Removed Competencies</Heading>
                      <ul className="mt-2 list-disc pl-6 text-red-700">
                        {correction.corrected_competencies.removed_competencies.map((comp: string, index: number) => (
                          <li key={`rem-comp-${index}`} className="mb-1">{comp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
                <Heading level={4} data-size="xs">Additional Suggested Competencies</Heading>
                <ul className="mt-2 list-disc pl-6">
                  {key_competencies.additional_suggested_competencies.map((comp: string, index: number) => (
                    <li key={`add-${index}`} className="mb-1">{comp}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-4">
                <Heading level={4} data-size="xs">Reasoning</Heading>
                <Paragraph className="mt-2 whitespace-pre-wrap">{key_competencies.reasoning}</Paragraph>
              </div>
            </Card.Block>
          </Card>
        </Tabs.Panel>
        
        <Tabs.Panel value="projects">
          <Card>
            <Card.Block>
              <Heading level={3} data-size="sm">Project Highlights</Heading>
              <Paragraph className="mt-2">
                Projects ordered by relevance to customer requirements. Top projects are most relevant.
              </Paragraph>
            </Card.Block>
            
            <Card.Block>
              <div className="space-y-4">
                {customized_projects.map((project: any, index: number) => (
                  <div key={`project-${index}`} className="border rounded-md overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                      <Heading level={4} data-size="xs">{project.project_name}</Heading>
                      <Tag data-color={
                        project.relevance_score >= 8 ? 'success' : 
                        project.relevance_score >= 5 ? 'warning' : 'danger'
                      }>
                        Relevance: {project.relevance_score}/10
                      </Tag>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-4">
                        <div>
                          <Heading level={5} data-size="xs">Original Description</Heading>
                          <Paragraph className="mt-2 whitespace-pre-wrap">{project.original_description}</Paragraph>
                        </div>
                        
                        <Divider data-spacing="true" />
                        
                        <div>
                          <Heading level={5} data-size="xs">
                            {correction ? 'Initial Customized Description' : 'Customized Description'}
                          </Heading>
                          <Paragraph className="mt-2 whitespace-pre-wrap">{project.customized_description}</Paragraph>
                        </div>
                        
                        {correction && correction.corrected_projects[index] && (
                          <>
                            <Divider data-spacing="true" />
                            
                            <div className="p-4 bg-green-50 rounded border border-green-200">
                              <Heading level={5} data-size="xs" className="text-green-800">Final Corrected Description</Heading>
                              <Paragraph className="mt-2 whitespace-pre-wrap text-green-700">{correction.corrected_projects[index].corrected_description}</Paragraph>
                              
                              {correction.corrected_projects[index].changes_made.length > 0 && (
                                <div className="mt-4">
                                  <Heading level={6} data-size="xs" className="text-green-800">Changes Made</Heading>
                                  <ul className="mt-2 list-disc pl-6 text-green-700">
                                    {correction.corrected_projects[index].changes_made.map((change: string, i: number) => (
                                      <li key={`proj-change-${i}`} className="mb-1">{change}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        
                        <Divider data-spacing="true" />
                        
                        <div>
                          <Heading level={5} data-size="xs">PARC Analysis</Heading>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Problem:</strong> {project.parc_analysis.problem}
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Accountability:</strong> {project.parc_analysis.accountability}
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Role:</strong> {project.parc_analysis.role}
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Result:</strong> {project.parc_analysis.result}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Heading level={5} data-size="xs">Reasoning</Heading>
                          <Paragraph className="mt-2 whitespace-pre-wrap">{project.reasoning}</Paragraph>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Block>
          </Card>
        </Tabs.Panel>
        
        <Tabs.Panel value="evaluation">
          <Card>
            <Card.Block>
              <Heading level={3} data-size="sm">
                Overall Evaluation
                <span className="ml-3">
                  <Tag data-color={
                    evaluation.overall_score >= 8 ? 'success' : 
                    evaluation.overall_score >= 5 ? 'warning' : 'danger'
                  }>
                    Score: {evaluation.overall_score}/10
                  </Tag>
                </span>
              </Heading>
              <Paragraph className="mt-2 whitespace-pre-wrap">{evaluation.overall_comments}</Paragraph>
            </Card.Block>
            
            <Card.Block>
              <Heading level={4} data-size="xs">Improvement Suggestions</Heading>
              <ul className="mt-2 list-disc pl-6">
                {evaluation.improvement_suggestions.map((suggestion: string, index: number) => (
                  <li key={`suggestion-${index}`} className="mb-1">{suggestion}</li>
                ))}
              </ul>
            </Card.Block>
            
            <Card.Block>
              <Heading level={4} data-size="xs">Requirement Coverage</Heading>
              <Table>
                <Table.Head>
                  <Table.Row>
                    <Table.Cell>Requirement</Table.Cell>
                    <Table.Cell>Coverage</Table.Cell>
                    <Table.Cell>Details</Table.Cell>
                    <Table.Cell>Improvement Suggestions</Table.Cell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {evaluation.requirement_coverage.map((coverage: any, index: number) => (
                    <Table.Row key={`coverage-${index}`}>
                      <Table.Cell>{coverage.requirement}</Table.Cell>
                      <Table.Cell>
                        <Tag data-color={coverage.covered ? 'success' : 'danger'}>
                          {coverage.covered ? 'Covered' : 'Not Covered'}
                        </Tag>
                      </Table.Cell>
                      <Table.Cell>{coverage.coverage_details}</Table.Cell>
                      <Table.Cell>{coverage.improvement_suggestions}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Card.Block>
          </Card>
        </Tabs.Panel>
        
        <Tabs.Panel value="validation">
          {validation && (
            <Card>
              <Card.Block>
                <Heading level={3} data-size="sm">
                  Content Validation
                  <span className="ml-3">
                    <Tag data-color={validation.overall_validation.passes_validation ? 'success' : 'danger'}>
                      {validation.overall_validation.passes_validation ? 'Passes Validation' : 'Failed Validation'}
                    </Tag>
                    <span className="ml-2">
                      <Tag data-color={
                        validation.overall_validation.confidence_score >= 8 ? 'success' : 
                        validation.overall_validation.confidence_score >= 5 ? 'warning' : 'danger'
                      }>
                        Confidence: {validation.overall_validation.confidence_score.toFixed(1)}/10
                      </Tag>
                    </span>
                  </span>
                </Heading>
                <Paragraph className="mt-2 whitespace-pre-wrap">{validation.overall_validation.summary}</Paragraph>
              </Card.Block>

              {validation.overall_validation.recommendations.length > 0 && (
                <Card.Block>
                  <Heading level={4} data-size="xs">Validation Recommendations</Heading>
                  <ul className="mt-2 list-disc pl-6">
                    {validation.overall_validation.recommendations.map((recommendation: string, index: number) => (
                      <li key={`validation-rec-${index}`} className="mb-1">{recommendation}</li>
                    ))}
                  </ul>
                </Card.Block>
              )}

              {/* Profile Validation */}
              <Card.Block>
                <Heading level={4} data-size="xs">
                  Profile Validation
                  <span className="ml-3">
                    <Tag data-color={validation.profile_validation.is_factually_accurate ? 'success' : 'danger'}>
                      {validation.profile_validation.is_factually_accurate ? 'Factually Accurate' : 'Contains Issues'}
                    </Tag>
                  </span>
                </Heading>
                
                <Paragraph className="mt-2 whitespace-pre-wrap">{validation.profile_validation.reasoning}</Paragraph>
                
                {validation.profile_validation.fabricated_claims.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 rounded border border-red-200">
                    <Heading level={5} data-size="xs" className="text-red-800">Fabricated Claims</Heading>
                    <ul className="mt-2 list-disc pl-6 text-red-700">
                      {validation.profile_validation.fabricated_claims.map((claim: string, index: number) => (
                        <li key={`fab-${index}`} className="mb-1">{claim}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validation.profile_validation.unsupported_claims.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
                    <Heading level={5} data-size="xs" className="text-yellow-800">Unsupported Claims</Heading>
                    <ul className="mt-2 list-disc pl-6 text-yellow-700">
                      {validation.profile_validation.unsupported_claims.map((claim: string, index: number) => (
                        <li key={`unsup-${index}`} className="mb-1">{claim}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validation.profile_validation.corrected_profile && validation.profile_validation.corrected_profile.trim() !== '' && (
                  <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
                    <Heading level={5} data-size="xs" className="text-green-800">Corrected Profile</Heading>
                    <Paragraph className="mt-2 whitespace-pre-wrap text-green-700">{validation.profile_validation.corrected_profile}</Paragraph>
                  </div>
                )}
              </Card.Block>

              {/* Competencies Validation */}
              <Card.Block>
                <Heading level={4} data-size="xs">Competencies Validation</Heading>
                <Paragraph className="mt-2 whitespace-pre-wrap">{validation.competencies_validation.reasoning}</Paragraph>
                
                {validation.competencies_validation.unsupported_competencies.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
                    <Heading level={5} data-size="xs" className="text-yellow-800">Unsupported Competencies</Heading>
                    <ul className="mt-2 list-disc pl-6 text-yellow-700">
                      {validation.competencies_validation.unsupported_competencies.map((comp: string, index: number) => (
                        <li key={`unsup-comp-${index}`} className="mb-1">{comp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card.Block>

              {/* Projects Validation */}
              <Card.Block>
                <Heading level={4} data-size="xs">Projects Validation</Heading>
                <div className="space-y-4 mt-4">
                  {validation.projects_validation.map((project: any, index: number) => (
                    <div key={`proj-val-${index}`} className="border rounded-md overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                        <Heading level={5} data-size="xs">{project.project_name}</Heading>
                        <Tag data-color={project.is_factually_accurate ? 'success' : 'danger'}>
                          {project.is_factually_accurate ? 'Accurate' : 'Contains Issues'}
                        </Tag>
                      </div>
                      
                      <div className="p-4">
                        <Paragraph className="whitespace-pre-wrap">{project.reasoning}</Paragraph>
                        
                        {project.fabricated_details.length > 0 && (
                          <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                            <Heading level={6} data-size="xs" className="text-red-800">Fabricated Details</Heading>
                            <ul className="mt-2 list-disc pl-6 text-red-700">
                              {project.fabricated_details.map((detail: string, i: number) => (
                                <li key={`fab-det-${i}`} className="mb-1">{detail}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {project.unsupported_claims.length > 0 && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                            <Heading level={6} data-size="xs" className="text-yellow-800">Unsupported Claims</Heading>
                            <ul className="mt-2 list-disc pl-6 text-yellow-700">
                              {project.unsupported_claims.map((claim: string, i: number) => (
                                <li key={`unsup-claim-${i}`} className="mb-1">{claim}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {project.corrected_description && project.corrected_description.trim() !== '' && (
                          <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                            <Heading level={6} data-size="xs" className="text-green-800">Corrected Description</Heading>
                            <Paragraph className="mt-2 whitespace-pre-wrap text-green-700">{project.corrected_description}</Paragraph>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Block>
            </Card>
          )}
        </Tabs.Panel>
        
        {correction && (
          <Tabs.Panel value="correction">
            <Card>
              <Card.Block>
                <Heading level={3} data-size="sm">
                  Content Correction Summary
                  <span className="ml-3">
                    <Tag data-color="success">
                      {correction.correction_summary.total_issues_fixed} Issues Fixed
                    </Tag>
                    <span className="ml-2">
                      <Tag data-color={
                        (correction.correction_summary.confidence_score * 10) >= 8 ? 'success' : 
                        (correction.correction_summary.confidence_score * 10) >= 5 ? 'warning' : 'danger'
                      }>
                        Confidence: {(correction.correction_summary.confidence_score * 10).toFixed(1)}/10
                      </Tag>
                    </span>
                  </span>
                </Heading>
              </Card.Block>

              {/* Major Changes */}
              {correction.correction_summary.major_changes.length > 0 && (
                <Card.Block>
                  <Heading level={4} data-size="xs">Major Changes Made</Heading>
                  <ul className="mt-2 list-disc pl-6">
                    {correction.correction_summary.major_changes.map((change: string, index: number) => (
                      <li key={`major-change-${index}`} className="mb-1">{change}</li>
                    ))}
                  </ul>
                </Card.Block>
              )}

              {/* Quality Improvements */}
              {correction.correction_summary.quality_improvements.length > 0 && (
                <Card.Block>
                  <Heading level={4} data-size="xs">Quality Improvements</Heading>
                  <ul className="mt-2 list-disc pl-6">
                    {correction.correction_summary.quality_improvements.map((improvement: string, index: number) => (
                      <li key={`improvement-${index}`} className="mb-1">{improvement}</li>
                    ))}
                  </ul>
                </Card.Block>
              )}

              {/* Corrected Profile */}
              <Card.Block>
                <Heading level={4} data-size="xs">Corrected Profile</Heading>
                <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
                  <Paragraph className="whitespace-pre-wrap">{correction.corrected_profile.profile}</Paragraph>
                </div>
                
                <div className="mt-4">
                  <Heading level={5} data-size="xs">Changes Made to Profile</Heading>
                  <ul className="mt-2 list-disc pl-6">
                    {correction.corrected_profile.changes_made.map((change: string, index: number) => (
                      <li key={`profile-change-${index}`} className="mb-1">{change}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-4">
                  <Heading level={5} data-size="xs">Reasoning</Heading>
                  <Paragraph className="mt-2 whitespace-pre-wrap">{correction.corrected_profile.reasoning}</Paragraph>
                </div>
              </Card.Block>

              {/* Corrected Competencies */}
              <Card.Block>
                <Heading level={4} data-size="xs">Corrected Competencies</Heading>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-green-50 rounded border border-green-200">
                    <Heading level={5} data-size="xs">Corrected Competencies</Heading>
                    <ul className="mt-2 list-disc pl-6">
                      {correction.corrected_competencies.competencies.map((comp: string, index: number) => (
                        <li key={`corr-comp-${index}`} className="mb-1">{comp}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {correction.corrected_competencies.removed_competencies.length > 0 && (
                    <div className="p-4 bg-red-50 rounded border border-red-200">
                      <Heading level={5} data-size="xs">Removed Competencies</Heading>
                      <ul className="mt-2 list-disc pl-6">
                        {correction.corrected_competencies.removed_competencies.map((comp: string, index: number) => (
                          <li key={`rem-comp-${index}`} className="mb-1">{comp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <Heading level={5} data-size="xs">Reasoning</Heading>
                  <Paragraph className="mt-2 whitespace-pre-wrap">{correction.corrected_competencies.reasoning}</Paragraph>
                </div>
              </Card.Block>

              {/* Corrected Projects */}
              <Card.Block>
                <Heading level={4} data-size="xs">Corrected Projects</Heading>
                <div className="space-y-4 mt-4">
                  {correction.corrected_projects.map((project: any, index: number) => (
                    <div key={`corr-proj-${index}`} className="border rounded-md overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b">
                        <Heading level={5} data-size="xs">{project.project_name}</Heading>
                      </div>
                      
                      <div className="p-4">
                        <div className="p-4 bg-green-50 rounded border border-green-200 mb-4">
                          <Heading level={6} data-size="xs">Corrected Description</Heading>
                          <Paragraph className="mt-2 whitespace-pre-wrap">{project.corrected_description}</Paragraph>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Heading level={6} data-size="xs">PARC Analysis</Heading>
                            <div className="mt-2 space-y-2">
                              <div><strong>Problem:</strong> {project.parc_analysis.problem}</div>
                              <div><strong>Accountability:</strong> {project.parc_analysis.accountability}</div>
                              <div><strong>Role:</strong> {project.parc_analysis.role}</div>
                              <div><strong>Result:</strong> {project.parc_analysis.result}</div>
                            </div>
                          </div>
                          
                          <div>
                            <Heading level={6} data-size="xs">Changes Made</Heading>
                            <ul className="mt-2 list-disc pl-6">
                              {project.changes_made.map((change: string, i: number) => (
                                <li key={`proj-change-${i}`} className="mb-1">{change}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div>
                          <Heading level={6} data-size="xs">Reasoning</Heading>
                          <Paragraph className="mt-2 whitespace-pre-wrap">{project.reasoning}</Paragraph>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Block>
            </Card>
          </Tabs.Panel>
        )}
      </Tabs>
    </div>
  );
} 