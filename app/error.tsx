'use client';

import { Button } from '@digdir/designsystemet-react';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error page:', error);
  }, [error]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
      <p className="text-gray-600 mb-4">
        We apologize for the inconvenience. An error occurred while processing your request.
      </p>
      {error.message && (
        <div className="p-3 bg-gray-100 rounded border border-gray-200 text-gray-800 text-sm mb-6 overflow-auto">
          {error.message}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => reset()} variant="primary">
          Try again
        </Button>
        <Button onClick={() => window.location.href = '/'} variant="secondary">
          Go to homepage
        </Button>
      </div>
    </div>
  );
} 