import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from '../auth/OIDCManager';

export function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await handleCallback();
        // Redirect to home after successful callback
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Callback error:', err);
        setError(
          err instanceof Error ? err.message : 'Authentication failed. Please try again.'
        );
        // Redirect to login after a short delay
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    })();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Failed</h1>
          <p className="text-red-800 mb-6">{error}</p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-800">Completing authentication...</h1>
        <p className="text-gray-600 mt-2">Please wait while we verify your credentials</p>
      </div>
    </div>
  );
}
