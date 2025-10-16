import { Metadata } from 'next'
import { whatsappBot } from '@/lib/whatsapp-bot'

export const metadata: Metadata = {
  title: 'WhatsApp Bot - Hotspot Manager',
  description: 'Manage WhatsApp bot for trader communication',
}

export default function WhatsAppPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Bot</h1>
          <p className="text-gray-600 mt-2">Manage WhatsApp bot for trader communication</p>
        </div>

        <div className="space-y-6">
          {/* Bot Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bot Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1 flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-700">Connected</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Queue Length</label>
                <p className="mt-1 text-sm text-gray-900">0 messages</p>
              </div>
            </div>
          </div>

          {/* Bot Commands */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Commands</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <code className="text-sm font-mono text-gray-900">/users</code>
                  <p className="text-sm text-gray-500">Show all trader's users</p>
                </div>
                <span className="text-xs text-gray-400">Traders only</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <code className="text-sm font-mono text-gray-900">/sessions</code>
                  <p className="text-sm text-gray-500">Show active sessions</p>
                </div>
                <span className="text-xs text-gray-400">Traders only</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <code className="text-sm font-mono text-gray-900">/status</code>
                  <p className="text-sm text-gray-500">Show trader status</p>
                </div>
                <span className="text-xs text-gray-400">Traders only</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <code className="text-sm font-mono text-gray-900">/help</code>
                  <p className="text-sm text-gray-500">Show available commands</p>
                </div>
                <span className="text-xs text-gray-400">All users</span>
              </div>
            </div>
          </div>

          {/* Send Test Message */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Send Test Message</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input 
                  type="tel" 
                  placeholder="+970598978187"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea 
                  rows={3}
                  placeholder="Enter your message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                ></textarea>
              </div>
              <button 
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Bot Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                <span>Bot connected successfully</span>
                <span className="text-gray-400 ml-auto">2 min ago</span>
              </div>
              <div className="flex items-center text-blue-600">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span>Message sent to +970598978187</span>
                <span className="text-gray-400 ml-auto">5 min ago</span>
              </div>
              <div className="flex items-center text-purple-600">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                <span>Command processed: /users</span>
                <span className="text-gray-400 ml-auto">8 min ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
