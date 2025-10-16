'use client';

import { useState } from 'react';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const setupTraders = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/setup-traders', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Setup Trader Authentication</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Setup Actions</h2>
          <p className="text-gray-600 mb-4">
            This will create authentication users for your traders so they can login to their dashboards.
          </p>
          <button
            onClick={setupTraders}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Setup Trader Authentication'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Setup Complete!</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Owner Login:</h3>
                <p className="text-gray-600">Username: admin, Password: admin</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Trader Logins:</h3>
                <div className="space-y-2">
                  {result.credentials?.traders?.map((trader: any) => (
                    <div key={trader.username} className="bg-gray-50 p-3 rounded">
                      <p><strong>Name:</strong> {trader.username}</p>
                      <p><strong>Username:</strong> {trader.username}</p>
                      <p><strong>Password:</strong> {trader.password}</p>
                      <p><strong>Phone:</strong> {trader.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <a 
                  href="/login" 
                  className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Go to Login Page
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
