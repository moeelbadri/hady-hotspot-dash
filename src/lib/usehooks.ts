import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

// ============================================================================
// QUERY HOOKS (GET requests)
// ============================================================================

// Auth Queries
export function useAuth() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/auth/me`);
      if (!response.ok) throw new Error('Failed to fetch auth');
      const result = await response.json();
      return result.success ? result.data : null;
    },
    retry: false,
  });
}

// Trader Queries
export function useTraders(customInterval?: number) {
  return useQuery({
    queryKey: ['all-traders'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders`);
      if (!response.ok) throw new Error('Failed to fetch traders');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    refetchInterval: customInterval ? customInterval * 1000 : 60000,
    staleTime: 30000,
  });
}

export function useTrader(phone: string) {
  return useQuery({
    queryKey: ['trader', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}`);
      if (!response.ok) throw new Error('Failed to fetch trader');
      const result = await response.json();
      return result.success ? result.data?.trader || result.data : null;
    },
    enabled: !!phone,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useTraderUsers(phone: string, customInterval?: number) {
  return useQuery({
    queryKey: ['trader-users', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}/users`);
      if (!response.ok) throw new Error('Failed to fetch trader users');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    enabled: !!phone,
    refetchInterval: customInterval ? customInterval * 1000 : 60000,
    staleTime: 30000,
  });
}

export function useTraderSessions(phone: string, customInterval?: number) {
  return useQuery({
    queryKey: ['trader-sessions', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}/sessions`);
      if (!response.ok) throw new Error('Failed to fetch trader sessions');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    enabled: !!phone,
    refetchInterval: customInterval ? customInterval * 1000 : 60000,
    staleTime: 30000,
  });
}

export function useTraderClients(phone: string) {
  return useQuery({
    queryKey: ['trader-clients', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}/clients`);
      if (!response.ok) throw new Error('Failed to fetch trader clients');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    enabled: !!phone,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useTraderTransactions(phone: string) {
  return useQuery({
    queryKey: ['trader-transactions', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch trader transactions');
      const result = await response.json();
      return result.success ? result.data?.transactions || result.data : [];
    },
    enabled: !!phone,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useTraderReports(phone: string) {
  return useQuery({
    queryKey: ['trader-reports', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/reports/trader/${phone}`);
      if (!response.ok) throw new Error('Failed to fetch trader reports');
      const result = await response.json();
      return result.success ? result.data : null;
    },
    enabled: !!phone,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useTraderPricing(phone: string) {
  return useQuery({
    queryKey: ['trader-pricing', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}/pricing`);
      if (!response.ok) throw new Error('Failed to fetch trader pricing');
      const result = await response.json();
      return result.success ? result.data : null;
    },
    enabled: !!phone,
    staleTime: 60000,
  });
}

export function useTraderDiscounts(phone: string) {
  return useQuery({
    queryKey: ['trader-discounts', phone],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/traders/${phone}/discounts`);
      if (!response.ok) throw new Error('Failed to fetch trader discounts');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    enabled: !!phone,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// MikroTik Queries
export function useMikroTiks() {
  return useQuery({
    queryKey: ['mikrotiks'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/mikrotiks`);
      if (!response.ok) throw new Error('Failed to fetch MikroTik routers');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useMikroTik(id: string) {
  return useQuery({
    queryKey: ['mikrotik', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/mikrotiks/${id}`);
      if (!response.ok) throw new Error('Failed to fetch MikroTik router');
      const result = await response.json();
      return result.success ? result.data : null;
    },
    enabled: !!id,
    staleTime: 60000,
  });
}

export function useMikroTikUsers(customInterval?: number) {
  return useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/mikrotik/users`);
      if (!response.ok) throw new Error('Failed to fetch MikroTik users');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    refetchInterval: customInterval ? customInterval * 1000 : 60000,
    staleTime: 30000,
  });
}

export function useMikroTikSessions(customInterval?: number) {
  return useQuery({
    queryKey: ['all-sessions'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/mikrotik/sessions`);
      if (!response.ok) throw new Error('Failed to fetch MikroTik sessions');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    refetchInterval: customInterval ? customInterval * 1000 : 60000,
    staleTime: 30000,
  });
}

export function useMikroTikInterfaces(mikrotikId: string) {
  return useQuery({
    queryKey: ['mikrotik-interfaces', mikrotikId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/mikrotiks/interfaces/available?mikrotikId=${mikrotikId}`);
      if (!response.ok) throw new Error('Failed to fetch available interfaces');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    enabled: !!mikrotikId,
    staleTime: 300000, // 5 minutes - interfaces don't change often
  });
}

// Reports Queries
export function useOwnerReports(customInterval?: number) {
  return useQuery({
    queryKey: ['owner-reports'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/reports/owner`);
      if (!response.ok) throw new Error('Failed to fetch owner reports');
      const result = await response.json();
      return result.success ? result.data : {};
    },
    refetchInterval: customInterval ? customInterval * 1000 : 60000,
    staleTime: 30000,
  });
}

// Clients Queries
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/clients`);
      if (!response.ok) throw new Error('Failed to fetch clients');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// ============================================================================
// MUTATION HOOKS (POST/PUT/DELETE requests)
// ============================================================================

// Auth Mutations
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Login failed');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Logout failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.clear();
    },
  });
}

// Trader Mutations
export function useCreateTrader() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (traderData: any) => {
      const response = await fetch(`${API_BASE}/traders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(traderData),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to create trader');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traders'] });
      queryClient.invalidateQueries({ queryKey: ['owner-reports'] });
    },
  });
}

export function useUpdateTrader() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ phone, updates }: { phone: string; updates: any }) => {
      const response = await fetch(`${API_BASE}/traders/${phone}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to update trader');
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['traders'] });
      queryClient.invalidateQueries({ queryKey: ['trader', variables.phone] });
      queryClient.invalidateQueries({ queryKey: ['owner-reports'] });
    },
  });
}

export function useDeleteTrader() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (phone: string) => {
      const response = await fetch(`${API_BASE}/traders/${phone}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete trader');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traders'] });
      queryClient.invalidateQueries({ queryKey: ['owner-reports'] });
      queryClient.invalidateQueries({ queryKey: ['mikrotik-users'] });
      queryClient.invalidateQueries({ queryKey: ['mikrotik-sessions'] });
    },
  });
}

export function useToggleTraderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ phone, isActive }: { phone: string; isActive: boolean }) => {
      const response = await fetch(`${API_BASE}/traders/${phone}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to toggle trader status');
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['traders'] });
      queryClient.invalidateQueries({ queryKey: ['trader', variables.phone] });
      queryClient.invalidateQueries({ queryKey: ['owner-reports'] });
    },
  });
}

// Credit Mutations
export function useAddCredit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ traderPhone, amount, description }: { traderPhone: string; amount: number; description?: string }) => {
      const response = await fetch(`${API_BASE}/credits/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traderPhone, amount, description }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to add credit');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['traders'] });
      queryClient.invalidateQueries({ queryKey: ['trader', variables.traderPhone] });
      queryClient.invalidateQueries({ queryKey: ['owner-reports'] });
      queryClient.invalidateQueries({ queryKey: ['trader-reports', variables.traderPhone] });
      queryClient.invalidateQueries({ queryKey: ['trader-transactions', variables.traderPhone] });
    },
  });
}

// Voucher Mutations
export function useCreateVoucher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ traderPhone, duration, quantity, username, password }: { traderPhone: string; duration: 'hour' | 'day' | 'week' | 'month'; quantity?: number; username?: string; password?: string }) => {
      const response = await fetch(`${API_BASE}/vouchers/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traderPhone, duration, quantity, username, password }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to create voucher');
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trader-users', variables.traderPhone] });
      queryClient.invalidateQueries({ queryKey: ['mikrotik-users'] });
      queryClient.invalidateQueries({ queryKey: ['trader-transactions', variables.traderPhone] });
      queryClient.invalidateQueries({ queryKey: ['trader-reports', variables.traderPhone] });
    },
  });
}

// Pricing Mutations
export function useUpdatePricing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ traderPhone, pricing }: { traderPhone: string; pricing: { hour: number; day: number; week: number; month: number } }) => {
      const response = await fetch(`${API_BASE}/traders/${traderPhone}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to update pricing');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trader-pricing', variables.traderPhone] });
      queryClient.invalidateQueries({ queryKey: ['trader', variables.traderPhone] });
    },
  });
}

// Discount Mutations
export function useCreateDiscount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ traderPhone, discountData }: { traderPhone: string; discountData: any }) => {
      const response = await fetch(`${API_BASE}/traders/${traderPhone}/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discountData),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to create discount');
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trader-discounts', variables.traderPhone] });
    },
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ traderPhone, discountId, discountData }: { traderPhone: string; discountId: string; discountData: any }) => {
      const response = await fetch(`${API_BASE}/traders/${traderPhone}/discounts/${discountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discountData),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to update discount');
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trader-discounts', variables.traderPhone] });
    },
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ traderPhone, discountId }: { traderPhone: string; discountId: string }) => {
      const response = await fetch(`${API_BASE}/traders/${traderPhone}/discounts/${discountId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete discount');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trader-discounts', variables.traderPhone] });
    },
  });
}

// MikroTik Mutations
export function useCreateMikroTik() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (mikrotikData: any) => {
      const response = await fetch(`${API_BASE}/mikrotiks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mikrotikData),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to create MikroTik router');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mikrotiks'] });
    },
  });
}

export function useUpdateMikroTik() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, mikrotikData }: { id: string; mikrotikData: any }) => {
      const response = await fetch(`${API_BASE}/mikrotiks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mikrotikData),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to update MikroTik router');
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mikrotiks'] });
      queryClient.invalidateQueries({ queryKey: ['mikrotik', variables.id] });
    },
  });
}

export function useDeleteMikroTik() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/mikrotiks/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete MikroTik router');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mikrotiks'] });
    },
  });
}

// Session Mutations
export function useDisconnectSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`${API_BASE}/mikrotik/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to disconnect session');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mikrotik-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['trader-sessions'] });
    },
  });
}

// Setup Mutations
export function useSetupTraders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/setup-traders`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to setup traders');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traders'] });
    },
  });
}

// Test Mutations
export function useTestMikroTik() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/mikrotik/test`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'MikroTik connection test failed');
      return result;
    },
  });
}

// Note: useDashboardData.ts now re-exports from this file for backward compatibility

