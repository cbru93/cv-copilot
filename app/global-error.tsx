'use client';

import { Button } from '@digdir/designsystemet-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to your error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We apologize for the inconvenience. The application encountered an unexpected error.
            </p>
            <div className="p-3 bg-gray-100 rounded border border-gray-200 text-gray-800 text-sm mb-6 overflow-auto">
              {error?.message || 'Unknown error occurred'}
            </div>
            <div className="flex gap-4">
              <Button onClick={() => reset()} variant="primary">
                Try again
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="secondary">
                Go to homepage
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 