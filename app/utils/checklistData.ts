export interface Checklist {
  id: string;
  name: string;
  content: string;
}

// Summary checklists
export const summaryChecklists: Checklist[] = [
  {
    id: 'default',
    name: 'Default Summary Checklist',
    content: `Summary checklist:
1) It has to use non-personal objective form to get more professional CV use e.g. "IPMA B certified Project manager with 10 years experience in Project management" instead of using the "I" form (e.g. "I am IPMA B certified Project manager with 10 years experience in Project management"). 
2) Avoid using your name in the summary. Use e.g. "Versatile and experience professional" instead of e.g. "John is a versatile and experience professional"
3) Summary length should be between 50 and 150 words.
4) In case the rephrased summary is longer than 100 words, split into 2 paragraphs, otherwise use a single paragraph of text.
5) Do NOT use bullet points, it should be a plain text.
6) Use correct UK English spelling and grammar, avoid typos.
7) Keep easily readable flow of text/sentences. Use rather longer sentences that will provide enough context for the reader rather than using short curt sentences disconnected from each other. The reader should be able to read the whole paragraph easily, like a story. 
8) Structure the summary as follows:
8a) Opening Statement: Who You Are (start with a strong, concise statement about your professional identity. Mention your job title and years of experience.) and Key Strengths (Highlight your main strengths or areas of expertise that are relevant.). Example: "Experienced HR Manager with over 10 years of expertise in talent acquisition, employee relations, and organizational development."
8b) Core Competencies and Skills: Technical and/or Industry Skills (Mention specific technical and/or industry skills or tools you are proficient in.) and Soft Skills (Include key soft skills that are important for the role, such as leadership, communication, or problem-solving.). Example: "Proficient in HRIS systems, employee engagement strategies, and conflict resolution. Strong leadership and communication skills. Known for innovative solutions and a track record of delivering projects on time and within budget."
8c) Achievements and Accomplishments: Highlight specific achievements or projects where you made a significant impact. Relevant Experience - focus on accomplishments that are directly relevant to your most recent roles. 
8d) Closing Statement: Career Goals (Briefly mention your career aspirations or what you are looking for in your next assignment.) and Call to Action (Encourage the reader to learn more about you by reviewing the rest of your CV.). Example: "Seeking to leverage my expertise in HR management to contribute to a dynamic organization. Eager to bring my skills and experience to a new challenge."`
  },
  {
    id: 'concise',
    name: 'Concise Summary Checklist',
    content: `Summary checklist (concise version):
1) Use objective third-person language (e.g., "IPMA B certified Project Manager" not "I am...")
2) Keep length between 50-100 words
3) Use a single paragraph format
4) Focus on key professional identity, core skills, and one major achievement
5) End with a brief statement of career goals
6) Use UK English spelling and grammar
7) Use flowing, connected sentences`
  },
  {
    id: 'technical',
    name: 'Technical Professional Summary Checklist',
    content: `Technical Professional Summary:
1) Use objective third-person form throughout
2) Lead with technical expertise and years of experience in specific domains
3) Mention key technical skills, programming languages, and technologies you've mastered
4) Include certifications and technical qualifications
5) Highlight measurable technical achievements with specific metrics
6) Mention experience with relevant methodologies (e.g., Agile, DevOps)
7) Length should be 75-150 words
8) Use UK English spelling and proper technical terminology
9) Structure as 1-2 paragraphs depending on length`
  }
];

// Assignments checklists
export const assignmentsChecklists: Checklist[] = [
  {
    id: 'default',
    name: 'Default Assignments Checklist',
    content: `Key assignments:
1) It is recommended to use non-personal objective form
2) Description length should be between 50 and 150 words
3) Avoid using bullet points, description should be written in form of one paragraphs of text, maximum two paragraphs if the text is longer.
4) Keep easily readable flow of text/sentences. Use rather longer sentences providing enough context for the reader rather than using short curt sentences disconnected from each other. The reader should be able to read the whole paragraph easily, like a story. 
5) Mention and describe role(s) you have played in the project. 
6) Mention skills that you have used in the project, especially technical skills. Skills should be mentioned within the description, where it makes sense. Not as an overview of skills used at the end of the paragraph.
7) Mention your key achievements in the project (but only if they are already mentioned in the original description - do not make up your own numbers and achievements).

Good examples of Key Assignment descriptions:
Example 1:
Led the infrastructure design and implementation for the new BASIC and GSP projects at the Customer for Education and Training. Throughout the project, had to find solutions that allow the components of the solution to communicate in the best possible way. Played a key role in the development of automated workflows and deployment processes using GitHub Actions, which streamlined the delivery and maintenance of both internal and external REST APIs.

Example 2:
Although initially had limited experience with C#/.Net, quickly acquired new skills and demonstrated an impressive ability to learn in a short period of time. After most of the infrastructure was in place, contributed significantly to the development of the backend solution in C#/.Net. Worked on complex system integrations, including role assignments during login based on access permissions in Alinam, which enhanced the solution's functionality and security.`
  },
  {
    id: 'achievement',
    name: 'Achievement-Focused Assignments',
    content: `Achievement-Focused Assignments:
1) Use objective third-person language throughout
2) Keep descriptions between 75-125 words in a single paragraph
3) Follow STAR method: Situation, Task, Action, Result
4) Begin with the role and responsibility
5) Focus on measurable achievements and outcomes
6) Quantify results where possible (percentages, time saved, revenue impact)
7) Highlight specific technical and soft skills used
8) Use strong action verbs (e.g., Implemented, Delivered, Transformed)
9) Include how your work impacted business objectives`
  },
  {
    id: 'technical',
    name: 'Technical Projects Checklist',
    content: `Technical Projects Assignments:
1) Use objective third-person form
2) Keep descriptions between 75-150 words
3) Specify the technical environment and tech stack used
4) Detail technical challenges encountered and solutions implemented
5) Mention specific technical skills and methodologies applied
6) Include technical metrics (performance improvements, etc.)
7) Describe integration points with other systems
8) Highlight technical innovation or process improvements
9) Mention team collaboration aspects if relevant`
  }
];

// For backwards compatibility
export const defaultSummaryChecklist = summaryChecklists[0].content;
export const defaultAssignmentsChecklist = assignmentsChecklists[0].content; 