import Link from 'next/link';
import { Button } from '@digdir/designsystemet-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
        <p className="text-gray-600 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" passHref>
          <Button variant="primary">
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
} 