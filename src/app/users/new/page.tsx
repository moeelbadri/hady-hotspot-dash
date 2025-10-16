import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Add New User - Hotspot Manager',
  description: 'Add a new user to the hotspot system',
}

export default function NewUser() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New User</h1>
          <p className="text-gray-600 mt-2">Create a new hotspot user account</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <form className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter username"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input 
                    type="tel" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Plan Selection</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer">
                  <div className="flex items-center">
                    <input type="radio" name="plan" value="basic" className="mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">Basic Plan</h4>
                      <p className="text-sm text-gray-500">1 GB/day, 1 Mbps</p>
                      <p className="text-lg font-semibold text-blue-600">$10/month</p>
                    </div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer">
                  <div className="flex items-center">
                    <input type="radio" name="plan" value="premium" className="mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">Premium Plan</h4>
                      <p className="text-sm text-gray-500">5 GB/day, 5 Mbps</p>
                      <p className="text-lg font-semibold text-blue-600">$25/month</p>
                    </div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer">
                  <div className="flex items-center">
                    <input type="radio" name="plan" value="unlimited" className="mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">Unlimited Plan</h4>
                      <p className="text-sm text-gray-500">Unlimited, 10 Mbps</p>
                      <p className="text-lg font-semibold text-blue-600">$50/month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Validity Period */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Validity Period</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input type="checkbox" id="auto-renew" className="mr-3" />
                  <label htmlFor="auto-renew" className="text-sm text-gray-700">
                    Auto-renew subscription
                  </label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="send-notifications" className="mr-3" />
                  <label htmlFor="send-notifications" className="text-sm text-gray-700">
                    Send email notifications
                  </label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="allow-multiple-sessions" className="mr-3" />
                  <label htmlFor="allow-multiple-sessions" className="text-sm text-gray-700">
                    Allow multiple concurrent sessions
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <a 
                href="/users"
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </a>
              <button 
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
