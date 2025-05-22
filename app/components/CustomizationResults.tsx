'use client';

import { useState } from 'react';
import { 
  Card,
  Heading, 
  Paragraph, 
  Table,
  Tag,
  Divider
} from '@digdir/designsystemet-react';

type TabValue = 'requirements' | 'profile' | 'competencies' | 'projects' | 'evaluation';

interface CustomizationResultsProps {
  result: any;
  isLoading: boolean;
}

export default function CustomizationResults({ 
  result, 
  isLoading 
}: CustomizationResultsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('requirements');
  
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
    evaluation
  } = result;
  
  return (
    <div>
      <div className="mb-4 border-b border-gray-200">
        <div className="flex space-x-4">
          <button 
            className={`py-2 px-4 border-b-2 ${activeTab === 'requirements' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('requirements')}
          >
            Requirements Analysis
          </button>
          <button 
            className={`py-2 px-4 border-b-2 ${activeTab === 'profile' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile Customization
          </button>
          <button 
            className={`py-2 px-4 border-b-2 ${activeTab === 'competencies' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('competencies')}
          >
            Key Competencies
          </button>
          <button 
            className={`py-2 px-4 border-b-2 ${activeTab === 'projects' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('projects')}
          >
            Project Highlights
          </button>
          <button 
            className={`py-2 px-4 border-b-2 ${activeTab === 'evaluation' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('evaluation')}
          >
            Evaluation
          </button>
        </div>
      </div>
      
      {activeTab === 'requirements' && (
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
      )}
      
      {activeTab === 'profile' && (
        <Card>
          <Card.Block>
            <Heading level={3} data-size="sm">Profile Customization</Heading>
            
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <Heading level={4} data-size="xs">Original Profile</Heading>
              <Paragraph className="mt-2 whitespace-pre-wrap">{profile_customization.original_profile}</Paragraph>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
              <Heading level={4} data-size="xs">Customized Profile</Heading>
              <Paragraph className="mt-2 whitespace-pre-wrap">{profile_customization.customized_profile}</Paragraph>
            </div>
            
            <div className="mt-4">
              <Heading level={4} data-size="xs">Reasoning</Heading>
              <Paragraph className="mt-2 whitespace-pre-wrap">{profile_customization.reasoning}</Paragraph>
            </div>
          </Card.Block>
        </Card>
      )}
      
      {activeTab === 'competencies' && (
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
                <Heading level={4} data-size="xs">Relevant Competencies</Heading>
                <ul className="mt-2 list-disc pl-6">
                  {key_competencies.relevant_competencies.map((comp: string, index: number) => (
                    <li key={`rel-${index}`} className="mb-1">{comp}</li>
                  ))}
                </ul>
              </div>
            </div>
            
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
      )}
      
      {activeTab === 'projects' && (
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
                        <Heading level={5} data-size="xs">Customized Description</Heading>
                        <Paragraph className="mt-2 whitespace-pre-wrap">{project.customized_description}</Paragraph>
                      </div>
                      
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
      )}
      
      {activeTab === 'evaluation' && (
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
      )}
    </div>
  );
} 