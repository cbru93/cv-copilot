// This is a Server Component (no 'use client' directive)
import { Suspense } from 'react';
import { 
  Heading, 
  Paragraph,
} from '@digdir/designsystemet-react';
import dynamic from 'next/dynamic';

// Import client components with dynamic imports to preserve the server/client boundary
const CVAnalyzer = dynamic(() => import('./components/CVAnalyzer'));
const DesignSystemToggle = dynamic(() => import('./components/DesignSystemToggle'));
const ClientDesignSystemWrapper = dynamic(() => import('./components/ClientDesignSystemWrapper'));

export default function Home() {
  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Heading level={1} data-size="xl">CV Enhancement Tool</Heading>
          <Paragraph data-size="md" className="max-w-3xl mx-auto">
            Improve your CV with AI-powered analysis based on company guidelines. Upload your CV, select an analysis type, and get personalized recommendations.
          </Paragraph>
          <Suspense fallback={<div>Loading design system toggle...</div>}>
            <DesignSystemToggle />
          </Suspense>
        </div>

        <Suspense fallback={<div>Loading design system components...</div>}>
          <ClientDesignSystemWrapper />
        </Suspense>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Suspense fallback={<div>Loading analyzer...</div>}>
            <CVAnalyzer />
          </Suspense>
        </div>

        <div className="mt-10 text-center">
          <Paragraph data-size="xs" data-color="subtle">
            Built with Next.js and the Vercel AI SDK. Upload your CV and checklist to get started.
          </Paragraph>
        </div>
      </div>
    </main>
  );
} 