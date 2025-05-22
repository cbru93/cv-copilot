'use client';

import StreamingTest from '../components/StreamingTest';
import { Heading, Paragraph, Link } from '@digdir/designsystemet-react';

export default function StreamingTestPage() {
  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <Heading level={1} data-size="xl">CV Analysis Streaming Test</Heading>
          <Paragraph data-size="md" className="max-w-3xl mx-auto">
            This page allows you to test the streaming functionality of the CV analysis API.
          </Paragraph>
          <Paragraph className="mt-2">
            <Link href="/">Return to main CV Enhancement Tool</Link>
          </Paragraph>
        </div>
        
        <StreamingTest />
      </div>
    </main>
  );
} 