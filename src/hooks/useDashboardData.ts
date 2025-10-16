import { useQuery } from '@tanstack/react-query';

// API endpoints
const API_BASE = '/api';

// Trader stats hook
export function useTraderStats(phone: string) {
  return useQuery({
    queryKey: ['trader-stats', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}`);
      if (!response.ok) throw new Error('Failed to fetch trader stats');
      const result = await response.json();
      return result.data?.trader || result.data || result; // Extract trader from nested data
    },
    enabled: !!phone,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  });
}

// Trader users hook
export function useTraderUsers(phone: string) {
  return useQuery({
    queryKey: ['trader-users', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}/users`);
      if (!response.ok) throw new Error('Failed to fetch trader users');
      const result = await response.json();
      return result.data || []; // Extract data array from API response
    },
    enabled: !!phone,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  });
}

// Trader sessions hook
export function useTraderSessions(phone: string) {
  return useQuery({
    queryKey: ['trader-sessions', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}/sessions`);
      if (!response.ok) throw new Error('Failed to fetch trader sessions');
      const result = await response.json();
      return result.data || []; // Extract data array from API response
    },
    enabled: !!phone,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  });
}

// Trader clients hook
export function useTraderClients(phone: string) {
  return useQuery({
    queryKey: ['trader-clients', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/clients/trader/${phone}`);
      if (!response.ok) throw new Error('Failed to fetch trader clients');
      const result = await response.json();
      return result.data || []; // Extract data array from API response
    },
    enabled: !!phone,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  });
}

// Trader transactions hook
export function useTraderTransactions(phone: string) {
  return useQuery({
    queryKey: ['trader-transactions', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch trader transactions');
      const result = await response.json();
      return result.data?.transactions || []; // Extract transactions array from API response
    },
    enabled: !!phone,
    refetchInterval: 30000, // 30 seconds - more frequent for transactions
    staleTime: 15000, // 15 seconds
  });
}

// All MikroTik devices hook
export function useMikroTikDevices() {
  return useQuery({
    queryKey: ['mikrotik-devices'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/mikrotiks`);
      if (!response.ok) throw new Error('Failed to fetch MikroTik devices');
      return response.json();
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  });
}

// All users hook
export function useAllUsers(customInterval?: number) {
  return useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/mikrotik/users`);
      if (!response.ok) throw new Error('Failed to fetch all users');
      const result = await response.json();
      return result.data || []; // Extract data array from API response
    },
    refetchInterval: customInterval ? customInterval * 1000 : 60000, // Use custom interval or default 1 minute
    staleTime: 30000, // 30 seconds
  });
}

// All sessions hook
export function useAllSessions(customInterval?: number) {
  return useQuery({
    queryKey: ['all-sessions'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/mikrotik/sessions`);
      if (!response.ok) throw new Error('Failed to fetch all sessions');
      const result = await response.json();
      return result.data || []; // Extract data array from API response
    },
    refetchInterval: customInterval ? customInterval * 1000 : 60000, // Use custom interval or default 1 minute
    staleTime: 30000, // 30 seconds
  });
}

// Owner reports hook
export function useOwnerReports(customInterval?: number) {
  return useQuery({
    queryKey: ['owner-reports'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/reports/owner`);
      if (!response.ok) throw new Error('Failed to fetch owner reports');
      const result = await response.json();
      return result.data || {}; // Extract data object from API response
    },
    refetchInterval: customInterval ? customInterval * 1000 : 60000, // Use custom interval or default 1 minute
    staleTime: 30000, // 30 seconds
  });
}

// All traders hook
export function useAllTraders(customInterval?: number) {
  return useQuery({
    queryKey: ['all-traders'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders`);
      if (!response.ok) throw new Error('Failed to fetch traders');
      const result = await response.json();
      return result.data || [];
    },
    refetchInterval: customInterval ? customInterval * 1000 : 60000, // Use custom interval or default 1 minute
    staleTime: 30000, // 30 seconds
  });
}
