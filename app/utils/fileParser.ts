export async function parsePDF(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/parse-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to parse PDF file');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

export async function parseTextFile(file: File): Promise<string> {
  try {
    const text = await file.text();
    return text;
  } catch (error) {
    console.error('Error parsing text file:', error);
    throw new Error('Failed to parse text file');
  }
}

// Default checklist content in case user doesn't upload one
export const defaultChecklistContent = `Summary checklist:
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
8d) Closing Statement: Career Goals (Briefly mention your career aspirations or what you are looking for in your next assignment.) and Call to Action (Encourage the reader to learn more about you by reviewing the rest of your CV.). Example: "Seeking to leverage my expertise in HR management to contribute to a dynamic organization. Eager to bring my skills and experience to a new challenge."

Key assignments:
1) It is recommended to use non-personal objective form
2) Description length should be between 50 and 150 words
3) Avoid using bullet points, description should be written in form of one paragraphs of text, maximum two paragraphs if the text is longer.
4) Keep easily readable flow of text/sentences. Use rather longer sentences providing enough context for the reader rather than using short curt sentences disconnected from each other. The reader should be able to read the whole paragraph easily, like a story. 
5) Mention and describe role(s) you have played in the project. 
6) Mention skills that you have used in the project, especially technical skills. Skills should be mentioned within the description, where it makes sense. Not as an overview of skills used at the end of the paragraph.
7) Mention your key achievements in the project (but only if they are already mentioned in the original description - do not make up your own numbers and achievements).`; 