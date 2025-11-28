'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { optimisticUpdates, selectiveRefresh } from '@/lib/optimistic-updates';
import { 
  useOwnerReports, 
  useMikroTikUsers as useAllUsers, 
  useMikroTikSessions as useAllSessions, 
  useTraders as useAllTraders,
  useMikroTiks,
  useMikroTikInterfaces,
  useTraderReports,
  useTraderUsers,
  useTraderClients,
  useTraderPricing,
  useAddCredit,
  useCreateTrader,
  useUpdateTrader,
  useDeleteTrader,
  useToggleTraderStatus,
  useCreateMikroTik,
  useDeleteMikroTik,
  useUpdatePricing,
  useLogout
} from '@/lib/usehooks';
import { useTheme } from '@/lib/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { TraderReportsChart } from '@/components/trader-reports-chart';
import DiscountManager from '@/components/DiscountManager';
import { SpinnerPage, Spinner } from '@/components/ui/spinner';
import { formatDuration, parseMikroTikTime, formatMikroTikTime } from '@/utils';

interface TraderStats {
  totalTraders: number;
  activeTraders: number;
  totalCredit: number;
  totalTransactions: number;
  totalVouchers: number;
  activeSessions: number;
}

interface TraderWithStats {
  phone: string;
  name: string;
  credit: number;
  isActive: boolean;
  totalUsers: number;
  activeSessions: number;
  totalVouchers: number;
  lastTransaction?: string;
}

// Component for trader content view using hooks
function TraderContentView({ 
  traderPhone, 
  currentView, 
  transactionFilter, 
  setTransactionFilter,
  isDarkMode,
  allTraders,
  traderPricing,
  setTraderPricing,
  updatePricing
}: {
  traderPhone: string;
  currentView: 'transactions' | 'users' | 'clients' | 'pricing' | 'reports';
  transactionFilter: string;
  setTransactionFilter: (filter: string) => void;
  isDarkMode: boolean;
  allTraders: any[];
  traderPricing: Record<string, any>;
  setTraderPricing: (pricing: any) => void;
  updatePricing: (traderPhone: string, pricing: any) => void;
}) {
  const { data: traderReports, isLoading: reportsLoading } = useTraderReports(traderPhone);
  const { data: traderUsers = [], isLoading: usersLoading } = useTraderUsers(traderPhone);
  const { data: traderClients = [], isLoading: clientsLoading } = useTraderClients(traderPhone);
  const { data: traderPricingData } = useTraderPricing(traderPhone);

  const isLoading = reportsLoading || usersLoading || clientsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" text={`Loading ${currentView}...`} />
      </div>
    );
  }

  if (currentView === 'transactions') {
    const transactions = traderReports?.activity?.recentTransactions || [];
    const filteredTransactions = transactionFilter === 'all' 
      ? transactions 
      : transactions.filter((t: any) => t.type === transactionFilter);
    
    return (
      <div>
        {/* Transaction Filter */}
        <div className="mb-6 px-4 py-3">
          <label className={`block text-sm font-medium mb-2 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Filter by Type:
          </label>
          <select
            value={transactionFilter}
            onChange={(e) => setTransactionFilter(e.target.value)}
            className={`px-3 py-2 border rounded-md text-sm transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Transactions</option>
            <option value="credit_add">Credit Added</option>
            <option value="voucher_purchase">Voucher Purchase</option>
            <option value="credit_deduct">Credit Deducted</option>
            <option value="refund">Refund</option>
          </select>
        </div>
        
        {filteredTransactions.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            <table className={`min-w-full divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={`sticky top-0 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Date</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Type</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Amount</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Created At</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Description</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                {filteredTransactions.map((transaction: any, index: number) => (
                  <tr key={transaction.id || index}>
                    <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.type === 'credit_add' 
                          ? 'bg-green-100 text-green-800'
                          : transaction.type === 'voucher_purchase'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.type === 'credit_add' ? 'Credit Added' :
                         transaction.type === 'voucher_purchase' ? 'Voucher Purchase' :
                         transaction.type === 'credit_deduct' ? 'Credit Deducted' :
                         transaction.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                        {transaction.amount > 0 ? '+' : ''}${transaction.amount}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {transaction.created_at ? new Date(transaction.created_at).toLocaleString().split(',')[1] : '-'}
                    </td>
                    <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{transaction.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`text-center py-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {transactions.length === 0 
              ? 'No transactions found for this trader.' 
              : `No ${transactionFilter === 'all' ? '' : transactionFilter.replace('_', ' ')} transactions found.`
            }
          </div>
        )}
      </div>
    );
  }

  if (currentView === 'users') {
    return traderUsers.length > 0 ? (
      <div className="max-h-80 overflow-y-auto">
        <table className={`min-w-full divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          <thead className={`sticky top-0 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <tr>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Username</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Mac Address</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>IP Address</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Limit Uptime</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Live Uptime</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Data Usage(in/out MB)</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Created</th>
            </tr>
          </thead>
          <tbody className={`divide-y transition-colors ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
            {traderUsers
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((user: any, index: number) => (
              <tr key={user.id || index}>
                <td className={`px-4 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.username}</td>
                <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.macAddress || '-'}</td>
                <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.address || '-'}</td>
                <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatMikroTikTime(user.limit_uptime || '0')}
                </td>
                <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user.uptime ? formatMikroTikTime(user.uptime) : '-'}
                </td>
                <td className="px-4 py-2 text-sm">
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
                <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user.bytes_in && user.bytes_out ? 
                    `${(user.bytes_in / 1024 / 1024).toFixed(1)}MB / ${(user.bytes_out / 1024 / 1024).toFixed(1)}MB` : 
                    '-'
                  }
                </td>
                <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className={`text-center py-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        No users found for this trader.
      </div>
    );
  }

  if (currentView === 'clients') {
    return traderClients.length > 0 ? (
      <div className="max-h-80 overflow-y-auto">
        <table className={`min-w-full divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          <thead className={`sticky top-0 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <tr>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Phone</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>MAC Address</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Session Info</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Rewarded User</th>
              <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Created</th>
            </tr>
          </thead>
          <tbody className={`divide-y transition-colors ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
            {traderClients.map((client: any, index: number) => (
              <tr key={client.id || index}>
                <td className={`px-4 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{client.phone}</td>
                <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{client.mac_address}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    client.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client.isActive ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {client.sessionData ? (
                    <div className="text-xs">
                      <div>IP: {client.sessionData.address}</div>
                      <div>User: {client.sessionData.username}</div>
                      <div>Uptime: {client.sessionData.uptime}</div>
                      <div>Data: {(client.sessionData.bytesIn / 1024 / 1024).toFixed(1)}MB / {(client.sessionData.bytesOut / 1024 / 1024).toFixed(1)}MB</div>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs">No active session</span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    client.rewarded_user ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client.rewarded_user ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className={`px-4 py-2 text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(client.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className={`text-center py-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        No clients found for this trader.
      </div>
    );
  }

  if (currentView === 'pricing') {
    const fullTrader = allTraders.find((t: any) => t.phone === traderPhone);
    const pricing = traderPricing[traderPhone] || traderPricingData || {
      hour: fullTrader?.hour_price || 1,
      day: fullTrader?.day_price || 4,
      week: fullTrader?.week_price || 20,
      month: fullTrader?.month_price || 60
    };
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'hour', label: 'Hour', icon: '⏰' },
            { key: 'day', label: 'Day', icon: '📅' },
            { key: 'week', label: 'Week', icon: '📆' },
            { key: 'month', label: 'Month', icon: '🗓️' }
          ].map((item) => (
            <div key={item.key} className={`rounded-lg p-4 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{item.icon}</span>
                  <span className={`font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>$</span>
                  <input
                    type="number"
                    value={pricing[item.key]}
                    onChange={(e) => setTraderPricing({
                      ...traderPricing,
                      [traderPhone]: {
                        ...pricing,
                        [item.key]: Number(e.target.value)
                      }
                    })}
                    className={`w-20 px-2 py-1 border rounded text-sm transition-colors ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                        : 'border-gray-300 text-gray-900 placeholder-gray-700'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button
            onClick={() => updatePricing(traderPhone, traderPricing[traderPhone] || pricing)}
            style={{ cursor: 'pointer' }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Update Pricing
          </button>
        </div>
        
        {/* Discount Manager */}
        <div className="mt-6">
          <DiscountManager 
            traderPhone={traderPhone} 
            isDarkMode={isDarkMode} 
          />
        </div>
      </div>
    );
  }

  if (currentView === 'reports') {
    return (
      <div className="p-4">
        <TraderReportsChart 
          traderPhone={traderPhone} 
          isDarkMode={isDarkMode} 
        />
      </div>
    );
  }

  return null;
}

export default function OwnerDashboard() {
  // React Query client for manual invalidation
  const queryClient = useQueryClient();
  
  // State declarations
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showCreateTrader, setShowCreateTrader] = useState(false);
  const [showCreateMikroTik, setShowCreateMikroTik] = useState(false);
  const [activeTab, setActiveTab] = useState<'traders' | 'mikrotiks'>('traders');
  const [expandedTraders, setExpandedTraders] = useState<Set<string>>(new Set());
  const [traderContentView, setTraderContentView] = useState<Record<string, 'transactions' | 'users' | 'clients' | 'pricing' | 'reports'>>({});
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const [traderPricing, setTraderPricing] = useState<Record<string, any>>({});
  const [transactionFilter, setTransactionFilter] = useState<string>('all');
  const [refreshInterval, setRefreshInterval] = useState<number>(60); // Default 60 seconds
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; trader: TraderWithStats | null }>({ show: false, trader: null });
  
  // React Query hooks for live data
  const { data: reports, isLoading: reportsLoading, error: reportsError } = useOwnerReports(refreshInterval);
  const { data: allUsers = [], isLoading: usersLoading, error: usersError } = useAllUsers(refreshInterval);
  const { data: allSessions = [], isLoading: sessionsLoading, error: sessionsError } = useAllSessions(refreshInterval);
  const { data: allTraders = [], isLoading: tradersLoading, error: tradersError } = useAllTraders(refreshInterval);

  // Calculate stats from live data
  const stats: TraderStats = {
    totalTraders: Array.isArray(allTraders) ? allTraders.length : 0,
    activeTraders: Array.isArray(allTraders) ? allTraders.filter(t => t.is_active).length : 0,
    totalCredit: Array.isArray(allTraders) ? allTraders.reduce((sum, trader) => sum + trader.credit, 0) : 0,
    totalTransactions: reports?.activity?.totalTransactions || 0,
    totalVouchers: Array.isArray(allUsers) ? allUsers.length : 0,
    activeSessions: Array.isArray(allSessions) ? allSessions.length : 0
  };

  const traders: TraderWithStats[] = (Array.isArray(allTraders) ? allTraders : []).map((trader: any) => {
    // Calculate real user and session counts for this trader
    // Users are filtered by comment field containing trader phone
    const traderUsers = Array.isArray(allUsers) ? allUsers.filter((user: any) => user.comment === trader.phone) : [];
    
    // Sessions are filtered by matching user names to trader users
    const traderUserNames = traderUsers.map((user: any) => user.name);
    const traderSessions = Array.isArray(allSessions) ? allSessions.filter((session: any) => 
      traderUserNames.includes(session.user)
    ) : [];
    
    return {
      phone: trader.phone,
      name: trader.name,
      credit: trader.credit,
      isActive: trader.is_active,
      totalUsers: traderUsers.length,
      activeSessions: traderSessions.length,
      totalVouchers: traderUsers.length, // Assuming each user is a voucher
      lastTransaction: undefined
    };
  });
  // MikroTik queries
  const { data: mikrotiks = [], isLoading: mikrotiksLoading } = useMikroTiks();
  
  const [newTrader, setNewTrader] = useState({
    name: '',
    phone: '',
    password: '',
    mikrotikId: '',
    mikrotikHost: '',
    mikrotikUsername: '',
    mikrotikPassword: '',
    mikrotikPort: 8728,
    ethernetPort: ''
  });
  
  // MikroTik interfaces query
  const { data: availablePorts = [], isLoading: loadingPorts } = useMikroTikInterfaces(newTrader.mikrotikId);
  const [newMikroTik, setNewMikroTik] = useState({
    name: '',
    host: '',
    username: '',
    password: '',
    port: 8728,
    description: '',
    isActive: true
  });

  // Mutations
  const addCreditMutation = useAddCredit();
  const createTraderMutation = useCreateTrader();
  const updateTraderMutation = useUpdateTrader();
  const deleteTraderMutation = useDeleteTrader();
  const toggleTraderStatusMutation = useToggleTraderStatus();
  const createMikroTikMutation = useCreateMikroTik();
  const deleteMikroTikMutation = useDeleteMikroTik();
  const updatePricingMutation = useUpdatePricing();
  const logoutMutation = useLogout();

  useEffect(() => {
    // Dashboard data is now managed by React Query hooks
    setLoading(false);
  }, []);

  // Auto-refresh trader data based on interval - handled by React Query refetchInterval

  const addCredit = async (traderPhone: string, amount: number) => {
    try {
      // Find the trader to get current credit
      const currentTrader = traders.find(t => t.phone === traderPhone);
      if (!currentTrader) return;

      // Apply optimistic update immediately
      optimisticUpdates.creditAdded(traderPhone, amount, currentTrader.credit);
      
      // Use mutation hook
      await addCreditMutation.mutateAsync({
        traderPhone,
        amount,
        description: `Credit added by owner: $${amount}`
      });
      
      setSelectedTrader(null);
      setCreditAmount(0);
    } catch (error) {
      console.error('Error adding credit:', error);
      // Data will be reverted via React Query
    }
  };

  const toggleTraderStatus = async (traderPhone: string) => {
    try {
      // Get current trader data
      const trader = allTraders.find((t: any) => t.phone === traderPhone);
      if (!trader) return;

      // Use mutation hook
      await toggleTraderStatusMutation.mutateAsync({
        phone: traderPhone,
        isActive: !trader.is_active
      });
    } catch (error) {
      console.error('Error toggling trader status:', error);
    }
  };

  const handleMikroTikSelection = (mikrotikId: string) => {
    const selectedMikroTik = mikrotiks.find((m: any) => m.id === mikrotikId);
    if (selectedMikroTik) {
      setNewTrader(prev => ({
        ...prev,
        mikrotikId,
        mikrotikHost: selectedMikroTik.host,
        mikrotikUsername: selectedMikroTik.username,
        mikrotikPassword: selectedMikroTik.password,
        mikrotikPort: selectedMikroTik.port,
        ethernetPort: '' // Reset ethernet port when MikroTik changes
      }));
    }
  };

  const createTrader = async () => {
    try {
      await createTraderMutation.mutateAsync(newTrader);
      
      setShowCreateTrader(false);
      setNewTrader({
        name: '',
        phone: '',
        password: '',
        mikrotikId: '',
        mikrotikHost: '',
        mikrotikUsername: '',
        mikrotikPassword: '',
        mikrotikPort: 8728,
        ethernetPort: ''
      });
    } catch (error) {
      console.error('Error creating trader:', error);
      alert('Failed to create trader. Please try again.');
    }
  };

  const createMikroTik = async () => {
    try {
      await createMikroTikMutation.mutateAsync(newMikroTik);
      
      setShowCreateMikroTik(false);
      setNewMikroTik({
        name: '',
        host: '',
        username: '',
        password: '',
        port: 8728,
        description: '',
        isActive: true
      });
    } catch (error) {
      console.error('Error creating MikroTik router:', error);
      alert('Failed to create MikroTik router. Please try again.');
    }
  };

  const deleteMikroTik = async (id: string) => {
    if (confirm('Are you sure you want to delete this MikroTik router?')) {
      try {
        await deleteMikroTikMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting MikroTik router:', error);
        alert('Failed to delete MikroTik router. Please try again.');
      }
    }
  };

  const toggleTraderExpansion = (traderPhone: string) => {
    const isExpanded = expandedTraders.has(traderPhone);
    
    if (isExpanded) {
      // Collapse the trader
      setExpandedTraders(prev => {
        const newSet = new Set(prev);
        newSet.delete(traderPhone);
        return newSet;
      });
    } else {
      // Expand the trader and set default view to transactions
      setExpandedTraders(prev => new Set(prev).add(traderPhone));
      setTraderContentView(prev => ({
        ...prev,
        [traderPhone]: 'transactions'
      }));
    }
  };

  const switchTraderContentView = (traderPhone: string, contentType: 'transactions' | 'users' | 'clients' | 'pricing' | 'reports') => {
    setTraderContentView(prev => ({
      ...prev,
      [traderPhone]: contentType
    }));
  };

  const updatePricing = async (traderPhone: string, newPricing: any) => {
    try {
      await updatePricingMutation.mutateAsync({
        traderPhone,
        pricing: newPricing
      });
      alert('Pricing updated successfully!');
    } catch (error) {
      console.error('Error updating pricing:', error);
      alert('Failed to update pricing. Please try again.');
    }
  };

  const deleteTrader = async (traderPhone: string) => {
    try {
      await deleteTraderMutation.mutateAsync(traderPhone);
      setDeleteConfirm({ show: false, trader: null });
    } catch (error) {
      console.error('Error deleting trader:', error);
      alert('Failed to delete trader. Please try again.');
    }
  };

  // Show loading state
  if (reportsLoading || usersLoading || sessionsLoading || tradersLoading) {
    return <SpinnerPage text="Loading dashboard..." />;
  }

  // Show error state
  if (reportsError || usersError || sessionsError || tradersError) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-lg text-red-600">
          Error loading dashboard: {reportsError?.message || usersError?.message || sessionsError?.message || tradersError?.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Mobile-friendly header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Owner Dashboard</h1>
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Live data (updates every {refreshInterval}s)
                </span>
              </div>
            </div>
            
            {/* Mobile-friendly controls */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Refresh controls - compact on mobile */}
              <div className="flex items-center gap-2">
                <label className={`text-xs sm:text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Refresh:
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className={`px-2 py-1 border rounded text-xs transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value={10}>10s</option>
                  <option value={20}>20s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                </select>
                <Button
                  variant="outline"
                  size="icon-sm"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    // Manual refresh of all data
                    queryClient.invalidateQueries({ queryKey: ['all-traders'] });
                    queryClient.invalidateQueries({ queryKey: ['owner-reports'] });
                    queryClient.invalidateQueries({ queryKey: ['all-users'] });
                    queryClient.invalidateQueries({ queryKey: ['all-sessions'] });
                    
                    // Refresh expanded trader data - handled by React Query
                    queryClient.invalidateQueries({ queryKey: ['trader-reports'] });
                    queryClient.invalidateQueries({ queryKey: ['trader-users'] });
                    queryClient.invalidateQueries({ queryKey: ['trader-clients'] });
                  }}
                  title="Refresh all data now"
                >
                  🔄
                </Button>
              </div>
              
              {/* Theme toggle and logout - compact */}
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="destructive"
                  size="sm"
                  style={{ cursor: 'pointer' }}
                  onClick={async () => {
                    try {
                      await logoutMutation.mutateAsync();
                      window.location.href = '/login';
                    } catch (error) {
                      console.error('Logout failed:', error);
                      window.location.href = '/login';
                    }
                  }}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className={`border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('traders')}
                style={{ cursor: 'pointer' }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'traders'
                    ? 'border-blue-500 text-blue-600'
                    : isDarkMode 
                      ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Traders ({traders.length})
              </button>
              <button
                onClick={() => setActiveTab('mikrotiks')}
                style={{ cursor: 'pointer' }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'mikrotiks'
                    ? 'border-blue-500 text-blue-600'
                    : isDarkMode 
                      ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                MikroTik Routers ({mikrotiks.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`rounded-lg shadow p-6 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Traders</p>
                  <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalTraders}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow p-6 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Traders</p>
                  <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.activeTraders}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow p-6 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Credit</p>
                  <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${stats.totalCredit}</p>
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
          </div>
        )}

        {/* Traders Tab */}
        {activeTab === 'traders' && (
          <div className={`rounded-lg shadow transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`px-6 py-4 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className={`text-lg font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Traders Management</h2>
              <Button
                onClick={() => setShowCreateTrader(true)}
                className="w-full sm:w-auto"
                size="sm"
                style={{ cursor: 'pointer' }}
              >
                + Create New Trader
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={`transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-8 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}></th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Trader</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Credit</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Users</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Sessions</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                {traders.map((trader) => (
                  <React.Fragment key={trader.phone}>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleTraderExpansion(trader.phone)}
                          style={{ cursor: 'pointer' }}
                          className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <svg
                            className={`w-4 h-4 transform transition-transform ${
                              expandedTraders.has(trader.phone) ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{trader.name}</div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{trader.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${trader.credit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trader.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {trader.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{trader.totalUsers}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{trader.activeSessions}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedTrader(trader.phone)}
                            style={{ cursor: 'pointer' }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Add Credit
                          </button>
                          <button
                            onClick={() => toggleTraderStatus(trader.phone)}
                            style={{ cursor: 'pointer' }}
                            className={`${
                              trader.isActive 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {trader.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ show: true, trader })}
                            style={{ cursor: 'pointer' }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedTraders.has(trader.phone) && (
                      <tr>
                        <td colSpan={7} className={`px-6 py-4 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className={`ml-12 rounded-lg shadow-sm border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                            <div className={`px-4 py-3 border-b transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                              <div className="flex items-center justify-between">
                                <h3 className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {traderContentView[trader.phone] === 'transactions' ? 'Recent Transactions' :
                                   traderContentView[trader.phone] === 'users' ? 'Users' :
                                   traderContentView[trader.phone] === 'clients' ? 'Active Clients' :
                                   traderContentView[trader.phone] === 'pricing' ? 'Voucher Pricing' :
                                   'Reports & Analytics'}
                                </h3>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => switchTraderContentView(trader.phone, 'transactions')}
                                    style={{ cursor: 'pointer' }}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                      traderContentView[trader.phone] === 'transactions'
                                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                                        : isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    Transactions
                                  </button>
                                  <button
                                    onClick={() => switchTraderContentView(trader.phone, 'users')}
                                    style={{ cursor: 'pointer' }}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                      traderContentView[trader.phone] === 'users'
                                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                                        : isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    Users
                                  </button>
                                  <button
                                    onClick={() => switchTraderContentView(trader.phone, 'clients')}
                                    style={{ cursor: 'pointer' }}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                      traderContentView[trader.phone] === 'clients'
                                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                                        : isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    Clients
                                  </button>
                                  <button
                                    onClick={() => switchTraderContentView(trader.phone, 'pricing')}
                                    style={{ cursor: 'pointer' }}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                      traderContentView[trader.phone] === 'pricing'
                                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                                        : isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    Pricing
                                  </button>
                                  <button
                                    onClick={() => switchTraderContentView(trader.phone, 'reports')}
                                    style={{ cursor: 'pointer' }}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                      traderContentView[trader.phone] === 'reports'
                                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                                        : isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    Reports
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <TraderContentView 
                                traderPhone={trader.phone}
                                currentView={traderContentView[trader.phone] || 'transactions'}
                                transactionFilter={transactionFilter}
                                setTransactionFilter={setTransactionFilter}
                                isDarkMode={isDarkMode}
                                allTraders={allTraders}
                                traderPricing={traderPricing}
                                setTraderPricing={setTraderPricing}
                                updatePricing={updatePricing}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* MikroTik Routers Tab */}
        {activeTab === 'mikrotiks' && (
          <div className={`rounded-lg shadow transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className={`text-lg font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>MikroTik Routers Management</h2>
                <Button
                  onClick={() => setShowCreateMikroTik(true)}
                  className="w-full sm:w-auto"
                  size="sm"
                  variant="secondary"
                  style={{ cursor: 'pointer' }}
                >
                  + Add MikroTik Router
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                <thead className={`transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Name</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Host</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Username</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Port</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Description</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                  {mikrotiks.map((mikrotik: any) => (
                    <tr key={mikrotik.host}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {mikrotik.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {mikrotik.host}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {mikrotik.username}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {mikrotik.port}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          mikrotik.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {mikrotik.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {mikrotik.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteMikroTik(mikrotik.id)}
                          style={{ cursor: 'pointer' }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Credit Modal */}
        {selectedTrader && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Credit</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedTrader(null);
                      setCreditAmount(0);
                    }}
                    style={{ cursor: 'pointer' }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => addCredit(selectedTrader, creditAmount)}
                    disabled={creditAmount <= 0}
                    style={{ cursor: creditAmount <= 0 ? 'not-allowed' : 'pointer' }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Credit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Trader Modal */}
        {showCreateTrader && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Trader</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trader Name
                    </label>
                    <input
                      type="text"
                      value={newTrader.name}
                      onChange={(e) => setNewTrader(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter trader name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-500 ml-2">(country code e.g. 2224567890)</span>
                    </label>
                    <input
                      type="tel"
                      value={newTrader.phone}
                      onChange={(e) => {
                        // Allow only digits, +, spaces, and dashes
                        const value = e.target.value.replace(/[^\d+\s-]/g, '');
                        setNewTrader(prev => ({ ...prev, phone: value }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2224567890"
                      pattern="^\d{5,15}$"
                    />
                    {newTrader.phone && !/^\d{5,15}$/.test(newTrader.phone.replace(/[\s-]/g, '')) && (
                      <p className="mt-1 text-sm text-red-500">
                        Phone number must include country code (e.g., 2224567890).
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newTrader.password}
                      onChange={(e) => setNewTrader(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter trader password"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Hotspot name will automatically be set to the phone number (without spaces or special characters).
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select MikroTik Router
                    </label>
                    <select
                      value={newTrader.mikrotikId}
                      onChange={(e) => handleMikroTikSelection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a MikroTik router...</option>
                      {mikrotiks.map((mikrotik: any) => (
                        <option key={mikrotik.id} value={mikrotik.id}>
                          {mikrotik.name} ({mikrotik.host}:{mikrotik.port})
                        </option>
                      ))}
                    </select>
                  </div>
                  {newTrader.mikrotikId && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Ethernet Port
                        {loadingPorts && (
                          <span className="ml-2 text-sm text-gray-500">(Loading...)</span>
                        )}
                      </label>
                      <select
                        value={newTrader.ethernetPort}
                        onChange={(e) => setNewTrader(prev => ({ ...prev, ethernetPort: e.target.value }))}
                        disabled={loadingPorts || availablePorts.length === 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                      >
                        <option value="">
                          {loadingPorts 
                            ? 'Loading available ports...' 
                            : availablePorts.length === 0 
                            ? 'No available ports found' 
                            : 'Choose an ethernet port...'}
                        </option>
                        {availablePorts.map((port: any) => (
                          <option key={port.id} value={port.name}>
                            {port.name} {port.defaultName && port.defaultName !== port.name ? `(${port.defaultName})` : ''} {port.macAddress ? `- ${port.macAddress}` : ''}
                          </option>
                        ))}
                      </select>
                      {availablePorts.length === 0 && !loadingPorts && newTrader.mikrotikId && (
                        <p className="mt-1 text-sm text-gray-500">
                          No available ethernet ports found. All ports may be in use or configured as slaves.
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MikroTik Host
                    </label>
                    <input
                      type="text"
                      value={newTrader.mikrotikHost}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50"
                      placeholder="Selected from router above"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newTrader.mikrotikUsername}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50"
                      placeholder="Selected from router above"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newTrader.mikrotikPassword}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50"
                      placeholder="Selected from router above"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      value={newTrader.mikrotikPort}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50"
                      placeholder="Selected from router above"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateTrader(false);
                      setNewTrader({
                        name: '',
                        phone: '',
                        password: '',
                        mikrotikId: '',
                        mikrotikHost: '',
                        mikrotikUsername: '',
                        mikrotikPassword: '',
                        mikrotikPort: 8728,
                        ethernetPort: ''
                      });
                    }}
                    style={{ cursor: 'pointer' }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTrader}
                    disabled={!newTrader.name || !newTrader.phone || !newTrader.password || !newTrader.mikrotikId || !/^(\+?[1-9]\d{9,14}|\d{10,15})$/.test(newTrader.phone.replace(/[\s-]/g, ''))}
                    style={{ cursor: (!newTrader.name || !newTrader.phone || !newTrader.password || !newTrader.mikrotikId || !/^(\+?[1-9]\d{9,14}|\d{10,15})$/.test(newTrader.phone.replace(/[\s-]/g, ''))) ? 'not-allowed' : 'pointer' }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create Trader
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create MikroTik Modal */}
        {showCreateMikroTik && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New MikroTik Router</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Router Name
                    </label>
                    <input
                      type="text"
                      value={newMikroTik.name}
                      onChange={(e) => setNewMikroTik(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter router name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Host/IP Address
                    </label>
                    <input
                      type="text"
                      value={newMikroTik.host}
                      onChange={(e) => setNewMikroTik(prev => ({ ...prev, host: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter IP address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newMikroTik.username}
                      onChange={(e) => setNewMikroTik(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newMikroTik.password}
                      onChange={(e) => setNewMikroTik(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      value={newMikroTik.port}
                      onChange={(e) => setNewMikroTik(prev => ({ ...prev, port: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter port"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newMikroTik.description}
                      onChange={(e) => setNewMikroTik(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter description (optional)"
                    />
                  </div>
                </div>
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newMikroTik.isActive}
                    onChange={(e) => setNewMikroTik(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCreateMikroTik(false)}
                    style={{ cursor: 'pointer' }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createMikroTik}
                    disabled={!newMikroTik.name || !newMikroTik.host || !newMikroTik.username || !newMikroTik.password}
                    style={{ cursor: (!newMikroTik.name || !newMikroTik.host || !newMikroTik.username || !newMikroTik.password) ? 'not-allowed' : 'pointer' }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Add MikroTik Router
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm.show && deleteConfirm.trader && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Trader</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete <strong>{deleteConfirm.trader.name}</strong> ({deleteConfirm.trader.phone})? 
                This action will permanently delete the trader and all associated data including users, sessions, and transactions. 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm({ show: false, trader: null })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteTrader(deleteConfirm.trader!.phone)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete Trader
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
