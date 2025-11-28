'use client';

import { useState } from 'react';
import { useTestMikroTik } from '@/lib/usehooks';
import { SpinnerInline } from '@/components/ui/spinner';

interface ConnectionStatus {
  connected: boolean;
  host: string;
  port: number;
  message: string;
}

export default function MikroTikConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const testMikroTikMutation = useTestMikroTik();

  const testConnection = async () => {
    try {
      const data = await testMikroTikMutation.mutateAsync();
      
      setStatus({
        connected: data.success,
        host: data.data?.host || '162.19.154.225',
        port: data.data?.port || 2080,
        message: data.message || data.error || 'Unknown status'
      });
    } catch (error: any) {
      setStatus({
        connected: false,
        host: '162.19.154.225',
        port: 2080,
        message: error.message || 'Connection test failed'
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">MikroTik Connection Test</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={testConnection}
            disabled={testMikroTikMutation.isPending}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center"
          >
            {testMikroTikMutation.isPending ? (
              <>
                <SpinnerInline size="sm" className="mr-2" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
          
          {status && (
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${status.connected ? 'text-green-700' : 'text-red-700'}`}>
                {status.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          )}
        </div>

        {status && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Host:</span>
                <span className="ml-2 text-gray-900">{status.host}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Port:</span>
                <span className="ml-2 text-gray-900">{status.port}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="font-medium text-gray-700">Status:</span>
              <span className={`ml-2 ${status.connected ? 'text-green-700' : 'text-red-700'}`}>
                {status.message}
              </span>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>API Connection:</strong> ws://162.19.154.225:8728</p>
          <p><strong>Hotspot Users:</strong> /ip/hotspot/user/print</p>
          <p><strong>Active Sessions:</strong> /ip/hotspot/active/print</p>
          <p className="mt-2">Make sure to set your MikroTik credentials in the environment variables.</p>
        </div>
      </div>
    </div>
  );
}
