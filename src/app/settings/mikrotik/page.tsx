import { Metadata } from 'next'
import MikroTikConnectionTest from '@/components/MikroTikConnectionTest'

export const metadata: Metadata = {
  title: 'MikroTik Configuration - Hotspot Manager',
  description: 'Configure MikroTik router connection',
}

export default function MikroTikSettings() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MikroTik Configuration</h1>
          <p className="text-gray-600 mt-2">Configure your MikroTik router connection</p>
        </div>

        <div className="space-y-6">
          {/* Connection Test */}
          <MikroTikConnectionTest />

          {/* Configuration Form */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">MikroTik API Settings</h3>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Router IP Address *
                    </label>
                    <input 
                      type="text" 
                      required
                      defaultValue="162.19.154.225"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="192.168.1.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Port
                    </label>
                    <input 
                      type="number" 
                      defaultValue="8728"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="8728"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input 
                      type="text" 
                      required
                      defaultValue="admin"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input 
                      type="password" 
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter password"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input type="checkbox" id="useSSL" className="mr-3" />
                  <label htmlFor="useSSL" className="text-sm text-gray-700">
                    Use SSL/TLS for secure connection
                  </label>
                </div>

                <div className="flex justify-end space-x-4">
                  <button 
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* API Endpoints Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">MikroTik API Commands</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Available Commands</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex items-center space-x-4">
                    <span className="text-blue-600 font-semibold w-20">PRINT</span>
                    <span>/ip/hotspot/user/print</span>
                    <span className="text-gray-500">- Get all users</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-green-600 font-semibold w-20">ADD</span>
                    <span>/ip/hotspot/user/add</span>
                    <span className="text-gray-500">- Create user</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-yellow-600 font-semibold w-20">SET</span>
                    <span>/ip/hotspot/user/set</span>
                    <span className="text-gray-500">- Update user</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-red-600 font-semibold w-20">REMOVE</span>
                    <span>/ip/hotspot/user/remove</span>
                    <span className="text-gray-500">- Delete user</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-blue-600 font-semibold w-20">PRINT</span>
                    <span>/ip/hotspot/active/print</span>
                    <span className="text-gray-500">- Get active sessions</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-red-600 font-semibold w-20">REMOVE</span>
                    <span>/ip/hotspot/active/remove</span>
                    <span className="text-gray-500">- Disconnect session</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MikroTik API Benefits */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">MikroTik API Benefits</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-sm text-gray-700">Easy to implement</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-sm text-gray-700">JSON responses</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-sm text-gray-700">Web-friendly</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-sm text-gray-700">Native MikroTik protocol</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-sm text-gray-700">Real-time WebSocket connection</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-sm text-gray-700">Better performance</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-sm text-gray-700">Direct API commands</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-sm text-gray-700">Lower latency</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
