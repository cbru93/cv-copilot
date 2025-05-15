'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import with ssr:false in a client component
const ClientDesignSystem = dynamic(() => import('./ClientDesignSystem'), {
  ssr: false,
  loading: () => <div>Loading design system...</div>
});

export default function ClientDesignSystemWrapper() {
  return (
    <Suspense fallback={<div>Loading design system components...</div>}>
      <ClientDesignSystem />
    </Suspense>
  );
} 