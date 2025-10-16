'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/db-utils-client';
import { optimisticUpdates, selectiveRefresh } from '@/lib/optimistic-updates';
import { useTraderStats, useTraderUsers, useTraderSessions, useTraderClients, useTraderTransactions } from '@/hooks/useDashboardData';
import { useQueryClient } from '@tanstack/react-query';
import { CreditsChart } from '@/components/credits-chart';
import { useTheme } from '@/lib/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import TraderDiscounts from '@/components/TraderDiscounts';
import { formatDuration, parseMikroTikTime, formatMikroTikTime } from '@/utils';

interface TraderStats {
  credit: number;
  totalUsers: number;
  activeSessions: number;
  totalVouchers: number;
  todayRevenue: number;
}

interface Pricing {
  hour: number;
  day: number;
  week: number;
  month: number;
}

export default function TraderDashboard() {
  const [traderPhone, setTraderPhone] = useState<string>('');
  const [pricing, setPricing] = useState<Pricing>({ hour: 1, day: 4, week: 20, month: 60 });
  const [discountedPricing, setDiscountedPricing] = useState<Pricing>({ hour: 1, day: 4, week: 20, month: 60 });
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  // React Query client for manual invalidation
  const queryClient = useQueryClient();
  
  // React Query hooks for live data
  const { data: trader, isLoading: traderLoading, error: traderError } = useTraderStats(traderPhone);
  const { data: usersData = [], isLoading: usersLoading, error: usersError } = useTraderUsers(traderPhone);
  const { data: sessionsData = [], isLoading: sessionsLoading, error: sessionsError } = useTraderSessions(traderPhone);
  const { data: clientsData = [], isLoading: clientsLoading, error: clientsError } = useTraderClients(traderPhone);
  const { data: transactionsData = [], isLoading: transactionsLoading, error: transactionsError } = useTraderTransactions(traderPhone);
  
  // Ensure data is always an array
  const users = Array.isArray(usersData) ? usersData : [];
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];
  const clients = Array.isArray(clientsData) ? clientsData : [];
  const transactions = Array.isArray(transactionsData) ? transactionsData : [];
  
  // Debug transactions data
  
  // Debug pricing data
  
  // Force refresh discounted pricing when trader phone changes
  useEffect(() => {
    if (traderPhone && pricing.hour > 0) {
      calculateDiscountedPrices(traderPhone, pricing);
    }
  }, [traderPhone, pricing.hour, pricing.day, pricing.week, pricing.month]);
  
  
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newUser, setNewUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'clients' | 'reports' | 'transactions'>('overview');

  // Debug logging

  // Calculate stats from live data
  const stats: TraderStats = {
    credit: trader?.credit || 0,
    totalUsers: users.length,
    activeSessions: sessions.length,
    totalVouchers: vouchers.length,
    todayRevenue: transactions
      .filter(t => new Date(t.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.success && data.data.user.type === 'trader') {
        const phone = data.data.user.phone;
        if (phone) {
          setTraderPhone(phone);
          loadTraderData(phone);
        }
      } else {
        // Temporary: Use test phone number for debugging
        setTraderPhone('22244974444');
        loadTraderData('22244974444');
      }
    } catch (error) {
      console.error('Auth check failed, using test phone number:', error);
      // Temporary: Use test phone number for debugging
      setTraderPhone('22244974444');
      loadTraderData('22244974444');
    }
  };

  const loadTraderData = async (phone: string) => {
    setLoading(true);
    try {
      const traderData = await apiClient.getTrader(phone);
      if (!traderData) {
        alert('Trader not found!');
        return;
      }

      // Set pricing from trader data
      const basePricing = {
        hour: traderData.pricing?.hour_price || 1,
        day: traderData.pricing?.day_price || 4,
        week: traderData.pricing?.week_price || 20,
        month: traderData.pricing?.month_price || 60
      };
      setPricing(basePricing);
      
      // Calculate discounted prices
      await calculateDiscountedPrices(phone, basePricing);

      // Load trader-specific data (this route already filters for the trader)
      let traderUsers: any[] = [];
      let traderSessions: any[] = [];
      
      try {
        const [users, sessions] = await Promise.all([
          apiClient.getTraderUsers(phone),
          apiClient.getTraderSessions(phone)
        ]);

        
        traderUsers = users;
        traderSessions = sessions;
      } catch (error) {
        console.warn('⚠️ Failed to load trader data:', error);
        
        // Set empty arrays as fallback
        traderUsers = [];
        traderSessions = [];
      }

      // Load reports for additional data
      const reports = await apiClient.getTraderReports(phone);
      if (reports) {
        setVouchers(reports.vouchers?.distribution || {});
      }
    } catch (error) {
      console.error('Error loading trader data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePricing = async (newPricing: Pricing) => {
    if (!trader) return;

    try {
      const success = await apiClient.updatePricing(trader.phone, newPricing);
      if (success) {
        setPricing(newPricing);
        // Recalculate discounted prices
        await calculateDiscountedPrices(trader.phone, newPricing);
        alert('Pricing updated successfully!');
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
    }
  };

  const calculateDiscountedPrices = async (phone: string, basePricing: Pricing) => {
    try {
      const discountedPrices: Pricing = { hour: 0, day: 0, week: 0, month: 0 };
      
      // Calculate discounted price for each category
      for (const [category, basePrice] of Object.entries(basePricing)) {
        const priceCalculation = await apiClient.calculateDiscountedPrice(
          phone, 
          category as 'hour' | 'day' | 'week' | 'month', 
          basePrice
        );
        discountedPrices[category as keyof Pricing] = priceCalculation.finalPrice;
      }
      
      setDiscountedPricing(discountedPrices);
    } catch (error) {
      console.error('Error calculating discounted prices:', error);
      // Fallback to base pricing if discount calculation fails
      setDiscountedPricing(basePricing);
    }
  };


  const createVoucher = async (duration: 'hour' | 'day' | 'week' | 'month', quantity: number = 1) => {
    if (!trader) return;

    // Calculate discounted price
    const basePrice = pricing?.[duration] || 1;
    const priceCalculation = await apiClient.calculateDiscountedPrice(trader.phone, duration, basePrice);
    const price = priceCalculation.finalPrice * quantity;
    
    if (trader.credit < price) {
      alert('Insufficient credit!');
      return;
    }

    try {
      // Apply optimistic update immediately
      const mockVoucher = {
        id: `temp_${Date.now()}`,
        username: `user_${Date.now()}`,
        password: Math.random().toString(36).substr(2, 8),
        duration,
        quantity,
        price,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      // Update UI optimistically
      optimisticUpdates.voucherCreated(trader.phone, mockVoucher, trader.credit);

      // Make actual API call
      const voucher = await apiClient.createVoucher(trader.phone, duration, quantity);
      if (voucher) {
        
        // Show new user details
        if ((voucher as any).data?.user) {
          setNewUser((voucher as any).data.user);
          setShowSuccess(true);
          // Auto-hide after 5 seconds
          setTimeout(() => {
            setShowSuccess(false);
            setNewUser(null);
          }, 5000);
        }
        
        setRefreshing(true);
        
        // Revalidate all trader-related queries to refresh data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['trader-stats', trader.phone] }),
          queryClient.invalidateQueries({ queryKey: ['trader-users', trader.phone] }),
          queryClient.invalidateQueries({ queryKey: ['trader-sessions', trader.phone] }),
          queryClient.invalidateQueries({ queryKey: ['owner-reports'] }),
          queryClient.invalidateQueries({ queryKey: ['all-users'] }),
          queryClient.invalidateQueries({ queryKey: ['all-sessions'] })
        ]);
        
        setRefreshing(false);
      } else {
        console.error('Failed to create voucher');
        // You can add error handling here
      }
    } catch (error) {
      console.error('Error creating voucher:', error);
      // You can add error handling here
    }
  };

  // Show loading state
  if (traderLoading || usersLoading || sessionsLoading || !traderPhone) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className={`text-lg transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (traderError || usersError || sessionsError) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-lg text-red-600">
          Error loading dashboard: {traderError?.message || usersError?.message || sessionsError?.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Trader Dashboard</h1>
            <div className="flex items-center mt-2">
              <div className={`w-2 h-2 rounded-full mr-2 ${refreshing ? 'bg-yellow-500 animate-spin' : 'bg-green-500 animate-pulse'}`}></div>
              <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {refreshing ? 'Refreshing data...' : 'Live data (updates every minute)'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className={`text-lg font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Welcome, {trader.name} ({trader.phone})
            </div>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`rounded-lg shadow p-6 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Credit Balance</p>
                  <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${stats.credit}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow p-6 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Users</p>
                  <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow p-6 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Sessions</p>
                  <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.activeSessions}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow p-6 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Monthly Revenue</p>
                  <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${(() => {
                    const now = new Date();
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    return transactions
                      .filter(t => {
                        const transactionDate = new Date(t.created_at);
                        return transactionDate >= monthStart && transactionDate <= monthEnd && t.amount < 0;
                      })
                      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
                  })()}</p>
                  <p className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>This month</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className={`rounded-lg shadow mb-6 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'users', name: 'Users' },
                { id: 'clients', name: 'Clients' },
                { id: 'reports', name: 'Reports' },
                { id: 'transactions', name: 'Transactions' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : isDarkMode 
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Active Discounts */}
                <TraderDiscounts traderPhone={traderPhone} isDarkMode={isDarkMode} />
                
                <h3 className={`text-lg font-medium mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
                
                {/* Hour Vouchers */}
                <div className="mb-6">
                  <h4 className={`text-md font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Hour Vouchers</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { duration: 'hour', hours: 1, price: discountedPricing?.hour || 1, label: '1 Hour' },
                      { duration: 'hour', hours: 2, price: (discountedPricing?.hour || 1) * 2, label: '2 Hours' },
                      { duration: 'hour', hours: 4, price: (discountedPricing?.hour || 1) * 4, label: '4 Hours' },
                      { duration: 'hour', hours: 8, price: (discountedPricing?.hour || 1) * 8, label: '8 Hours' },
                      { duration: 'hour', hours: 12, price: (discountedPricing?.hour || 1) * 12, label: '12 Hours' }
                    ].map((voucher) => (
                      <button
                        key={`${voucher.duration}-${voucher.hours}`}
                        onClick={() => createVoucher(voucher.duration as any, voucher.hours)}
                        disabled={refreshing}
                        className={`p-3 rounded-lg transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''} ${
                          isDarkMode 
                            ? 'bg-blue-900/20 hover:bg-blue-900/30' 
                            : 'bg-blue-50 hover:bg-blue-100'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-600">${voucher.price}</div>
                          <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {refreshing ? 'Refreshing...' : voucher.label}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Vouchers */}
                <div className="mb-6">
                  <h4 className={`text-md font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Day Vouchers</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { duration: 'day', days: 1, price: pricing?.day || 4, label: '1 Day' },
                      { duration: 'day', days: 2, price: (pricing?.day || 4) * 2, label: '2 Days' },
                      { duration: 'day', days: 4, price: (pricing?.day || 4) * 4, label: '4 Days' },
                      { duration: 'day', days: 6, price: (pricing?.day || 4) * 6, label: '6 Days' }
                    ].map((voucher) => (
                      <button
                        key={`${voucher.duration}-${voucher.days}`}
                        onClick={() => createVoucher(voucher.duration as any, voucher.days)}
                        disabled={refreshing}
                        className={`p-3 rounded-lg transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''} ${
                          isDarkMode 
                            ? 'bg-green-900/20 hover:bg-green-900/30' 
                            : 'bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">${voucher.price}</div>
                          <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {refreshing ? 'Refreshing...' : voucher.label}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Week Vouchers */}
                <div className="mb-6">
                  <h4 className={`text-md font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Week Vouchers</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { duration: 'week', weeks: 1, price: pricing?.week || 20, label: '1 Week' },
                      { duration: 'week', weeks: 2, price: (pricing?.week || 20) * 2, label: '2 Weeks' },
                      { duration: 'week', weeks: 3, price: (pricing?.week || 20) * 3, label: '3 Weeks' },
                      { duration: 'week', weeks: 4, price: (pricing?.week || 20) * 4, label: '4 Weeks' }
                    ].map((voucher) => (
                      <button
                        key={`${voucher.duration}-${voucher.weeks}`}
                        onClick={() => createVoucher(voucher.duration as any, voucher.weeks)}
                        disabled={refreshing}
                        className={`p-3 rounded-lg transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''} ${
                          isDarkMode 
                            ? 'bg-yellow-900/20 hover:bg-yellow-900/30' 
                            : 'bg-yellow-50 hover:bg-yellow-100'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-xl font-bold text-yellow-600">${voucher.price}</div>
                          <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {refreshing ? 'Refreshing...' : voucher.label}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Month Vouchers */}
                <div className="mb-6">
                  <h4 className={`text-md font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Month Vouchers</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { duration: 'month', months: 1, price: discountedPricing?.month || 60, label: '1 Month' },
                      { duration: 'month', months: 2, price: (discountedPricing?.month || 60) * 2, label: '2 Months' },
                      { duration: 'month', months: 4, price: (discountedPricing?.month || 60) * 4, label: '4 Months' },
                      { duration: 'month', months: 6, price: (discountedPricing?.month || 60) * 6, label: '6 Months' },
                      { duration: 'month', months: 12, price: (discountedPricing?.month || 60) * 12, label: '12 Months' }
                    ].map((voucher) => (
                      <button
                        key={`${voucher.duration}-${voucher.months}`}
                        onClick={() => createVoucher(voucher.duration as any, voucher.months)}
                        disabled={refreshing}
                        className={`p-3 rounded-lg transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''} ${
                          isDarkMode 
                            ? 'bg-purple-900/20 hover:bg-purple-900/30' 
                            : 'bg-purple-50 hover:bg-purple-100'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-600">${voucher.price}</div>
                          <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {refreshing ? 'Refreshing...' : voucher.label}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <h3 className={`text-lg font-medium mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your Users</h3>
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={`transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Username</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Mac Address</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>IP Address</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Limit Uptime</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Live Uptime</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Data Usage</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Created</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y transition-colors ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                      {users
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((user) => (
                        <tr key={`${user.username}-${user.created_at}`}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.username}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{user['mac-address'] || '-'}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{user.address || '-'}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {formatMikroTikTime(user.limit_uptime || '0')}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {user.uptime ? formatMikroTikTime(user.uptime) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : user.disabled 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.isActive ? 'Online' : user.disabled ? 'Disabled' : 'Offline'}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {user.bytes_in && user.bytes_out ? 
                              `${(user.bytes_in / 1024 / 1024).toFixed(1)}MB / ${(user.bytes_out / 1024 / 1024).toFixed(1)}MB` : 
                              '-'
                            }
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {new Date(user.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Clients Tab */}
            {activeTab === 'clients' && (
              <div>
                <h3 className={`text-lg font-medium mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your Clients</h3>
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={`transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Phone</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>MAC Address</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Session Info</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Rewarded User</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Created</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y transition-colors ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                      {clients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={`px-6 py-4 text-center text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No clients found
                          </td>
                        </tr>
                      ) : (
                        clients.map((client) => (
                          <tr key={client.id}>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{client.phone}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{client.macAddress}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                client.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {client.isActive ? 'Online' : 'Offline'}
                              </span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {client.sessionData ? (
                                <div className="text-xs">
                                  <div>IP: {client.sessionData.address}</div>
                                  <div>User: {client.sessionData.username}</div>
                                  <div>Uptime: {client.sessionData.uptime}</div>
                                  <div>Data: {(client.sessionData.bytesIn / 1024 / 1024).toFixed(1)}MB / {(client.sessionData.bytesOut / 1024 / 1024).toFixed(1)}MB</div>
                                </div>
                              ) : (
                                'No active session'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                client.rewardedUser ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {client.rewardedUser ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {new Date(client.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}


            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div>
                <h3 className={`text-lg font-medium mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Reports</h3>
                
                {/* Monthly Revenue Chart */}
                <div className="mb-6">
                  <h4 className={`text-md font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Weekly Revenue Trend</h4>
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }, (_, i) => {
                        const day = new Date();
                        day.setDate(day.getDate() - (6 - i));
                        const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                        const dayStart = new Date(day);
                        dayStart.setHours(0, 0, 0, 0);
                        const dayEnd = new Date(day);
                        dayEnd.setHours(23, 59, 59, 999);
                        
                        // Calculate real revenue for this day
                        const dayRevenue = transactions
                          .filter(t => {
                            const transactionDate = new Date(t.created_at);
                            return transactionDate >= dayStart && transactionDate <= dayEnd && t.amount < 0; // Negative amounts are expenses (voucher purchases)
                          })
                          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
                        
                        const maxRevenue = Math.max(...Array.from({ length: 7 }, (_, j) => {
                          const checkDay = new Date();
                          checkDay.setDate(checkDay.getDate() - (6 - j));
                          const checkDayStart = new Date(checkDay);
                          checkDayStart.setHours(0, 0, 0, 0);
                          const checkDayEnd = new Date(checkDay);
                          checkDayEnd.setHours(23, 59, 59, 999);
                          return transactions
                            .filter(t => {
                              const transactionDate = new Date(t.created_at);
                              return transactionDate >= checkDayStart && transactionDate <= checkDayEnd && t.amount < 0;
                            })
                            .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
                        })) || 1;
                        
                        return (
                          <div key={i} className="text-center">
                            <div className={`text-xs mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{dayName}</div>
                            <div className="bg-blue-500 rounded-t" style={{ height: `${(dayRevenue / maxRevenue) * 60}px` }}></div>
                            <div className={`text-xs mt-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>${dayRevenue}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Voucher Usage Chart */}
                <div className="mb-6">
                  <h4 className={`text-md font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Voucher Usage by Duration</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { duration: 'Hour', limitUptime: 'hour', color: 'bg-blue-500' },
                      { duration: 'Day', limitUptime: 'day', color: 'bg-green-500' },
                      { duration: 'Week', limitUptime: 'week', color: 'bg-yellow-500' },
                      { duration: 'Month', limitUptime: 'month', color: 'bg-red-500' }
                    ].map((item, index) => {
                      // Count real vouchers by duration category based on comment field
                      const count = users.filter(user => {
                        const userComment = user.comment || '';
                        // Categorize based on the comment field
                        if (item.limitUptime === 'hour') {
                          // Include all hour-based vouchers
                          return userComment.includes('hour') || 
                                 userComment.includes('Hour') ||
                                 (!userComment.includes('day') && !userComment.includes('week') && !userComment.includes('month') && userComment.includes('Voucher'));
                        } else if (item.limitUptime === 'day') {
                          // Include all day-based vouchers
                          return userComment.includes('day') || 
                                 userComment.includes('Day');
                        } else if (item.limitUptime === 'week') {
                          // Include all week-based vouchers
                          return userComment.includes('week') || 
                                 userComment.includes('Week');
                        } else if (item.limitUptime === 'month') {
                          // Include all month-based vouchers
                          return userComment.includes('month') || 
                                 userComment.includes('Month');
                        }
                        return false;
                      }).length;
                      return (
                        <div key={index} className="text-center">
                          <div className={`w-16 h-16 ${item.color} rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
                            {count}
                          </div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.duration}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <h5 className={`font-medium transition-colors ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>Monthly Revenue</h5>
                    <p className="text-2xl font-bold text-blue-600">${(() => {
                      const now = new Date();
                      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      return transactions
                        .filter(t => {
                          const transactionDate = new Date(t.created_at);
                          return transactionDate >= monthStart && transactionDate <= monthEnd && t.amount < 0;
                        })
                        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
                    })()}</p>
                    <p className={`text-sm transition-colors ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>This month</p>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                    <h5 className={`font-medium transition-colors ${isDarkMode ? 'text-green-300' : 'text-green-900'}`}>Active Users</h5>
                    <p className="text-2xl font-bold text-green-600">{users.length}</p>
                    <p className={`text-sm transition-colors ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>Total users</p>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                    <h5 className={`font-medium transition-colors ${isDarkMode ? 'text-purple-300' : 'text-purple-900'}`}>Active Sessions</h5>
                    <p className="text-2xl font-bold text-purple-600">{sessions.length}</p>
                    <p className={`text-sm transition-colors ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Currently online</p>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <h3 className={`text-lg font-medium mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Transaction History</h3>
                
                {/* Credits Over Time Chart */}
                <div className="mb-6">
                  <CreditsChart 
                    data={(() => {
                      // Calculate data points for the last 7 days
                      return Array.from({ length: 7 }, (_, i) => {
                        const day = new Date();
                        day.setDate(day.getDate() - (6 - i));
                        const dayStart = new Date(day);
                        dayStart.setHours(0, 0, 0, 0);
                        const dayEnd = new Date(day);
                        dayEnd.setHours(23, 59, 59, 999);
                        
                        const dayTransactions = transactions.filter(t => {
                          const transactionDate = new Date(t.created_at);
                          return transactionDate >= dayStart && transactionDate <= dayEnd;
                        });
                        
                        // Calculate cumulative credits up to this day
                        const allTransactionsUpToToday = transactions.filter(t => {
                          const transactionDate = new Date(t.created_at);
                          return transactionDate <= dayEnd;
                        });
                        
                        const credits = allTransactionsUpToToday.reduce((sum, t) => sum + (t.amount || 0), 0);
                        
                        return {
                          day: day.toLocaleDateString('en-US', { weekday: 'short' }),
                          credits: credits,
                          date: day.toLocaleDateString()
                        };
                      });
                    })()}
                    isDarkMode={isDarkMode}
                  />
                </div>
                
                {/* Transaction Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Transaction Volume Chart */}
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Transaction Volume (Last 7 Days)</h4>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 7 }, (_, i) => {
                        const day = new Date();
                        day.setDate(day.getDate() - (6 - i));
                        const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                        const dayStart = new Date(day);
                        dayStart.setHours(0, 0, 0, 0);
                        const dayEnd = new Date(day);
                        dayEnd.setHours(23, 59, 59, 999);
                        
                        // Count real transactions for this day
                        const dayTransactions = transactions.filter(t => {
                          const transactionDate = new Date(t.created_at);
                          return transactionDate >= dayStart && transactionDate <= dayEnd;
                        });
                        const volume = dayTransactions.length;
                        
                        // Debug logging for first day
                        if (i === 0) {
                        }
                        
                        const maxVolume = Math.max(...Array.from({ length: 7 }, (_, j) => {
                          const checkDay = new Date();
                          checkDay.setDate(checkDay.getDate() - (6 - j));
                          const checkDayStart = new Date(checkDay);
                          checkDayStart.setHours(0, 0, 0, 0);
                          const checkDayEnd = new Date(checkDay);
                          checkDayEnd.setHours(23, 59, 59, 999);
                          return transactions.filter(t => {
                            const transactionDate = new Date(t.created_at);
                            return transactionDate >= checkDayStart && transactionDate <= checkDayEnd;
                          }).length;
                        })) || 1;
                        
                        return (
                          <div key={i} className="text-center">
                            <div className={`text-xs mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{dayName}</div>
                            <div className="bg-green-500 rounded-t" style={{ height: `${(volume / maxVolume) * 40}px` }}></div>
                            <div className={`text-xs mt-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{volume}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transaction Types Chart */}
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Transaction Types</h4>
                    <div className="space-y-3">
                      {(() => {
                        // Calculate real transaction counts by type
                        const voucherSales = transactions.filter(t => t.type === 'voucher_purchase').length;
                        const creditAdded = transactions.filter(t => t.type === 'credit_add').length;
                        const refunds = transactions.filter(t => t.type === 'refund').length;
                        const total = transactions.length;
                        
                        return [
                          { type: 'Voucher Sales', count: voucherSales, color: '#3B82F6', percentage: total > 0 ? Math.round((voucherSales / total) * 100) : 0 },
                          { type: 'Credit Added', count: creditAdded, color: '#10B981', percentage: total > 0 ? Math.round((creditAdded / total) * 100) : 0 },
                          { type: 'Refunds', count: refunds, color: '#EF4444', percentage: total > 0 ? Math.round((refunds / total) * 100) : 0 }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                            <span className={`text-sm flex-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.type}</span>
                            <span className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.count}</span>
                            <span className={`text-xs ml-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>({item.percentage}%)</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={`transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Type</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Amount</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Description</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Date</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y transition-colors ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                      {transactions.map((transaction, index) => (
                        <tr key={transaction.id || `transaction-${index}-${transaction.created_at}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              transaction.type === 'credit_add' ? 'bg-green-100 text-green-800' :
                              transaction.type === 'voucher_purchase' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {transaction.type.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}${transaction.amount}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{transaction.description}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {new Date(transaction.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {showSuccess && newUser && (
        <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">✅ Voucher Created Successfully!</h3>
              <div className="mt-2 text-sm">
                <p><strong>Username:</strong> {newUser.username}</p>
                <p><strong>Duration:</strong> {newUser.limit_uptime}</p>
                <p><strong>Profile:</strong> {newUser.profile}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowSuccess(false);
                setNewUser(null);
              }}
              className="ml-4 text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
