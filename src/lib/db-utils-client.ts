// Client-side database utilities that use API calls
// This file is safe to import in client components

export interface Trader {
  phone: string;
  name: string;
  hotspotName: string;
  mikrotikHost: string;
  mikrotikUsername: string;
  mikrotikPassword: string;
  mikrotikPort: number;
  credit: number;
  isActive: boolean;
  pricing: {
    hour_price: number;
    day_price: number;
    week_price: number;
    month_price: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  traderPhone: string;
  username: string;
  password: string;
  profile: string;
  limitUptime: string;
  limitBytesIn: string;
  limitBytesOut: string;
  limitBytesTotal: string;
  comment: string;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  traderPhone: string;
  username: string;
  address: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  startedAt: string;
}

export interface Transaction {
  id: string;
  traderPhone: string;
  type: 'credit_add' | 'credit_deduct' | 'voucher_purchase' | 'refund';
  amount: number;
  description: string;
  voucherId?: string;
  createdAt: string;
}

export interface Voucher {
  id: string;
  traderPhone: string;
  username: string;
  password: string;
  duration: 'hour' | 'day' | 'week' | 'month';
  price: number;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
}

// Client-side API functions
export const apiClient = {
  // Traders
  async getTraders(): Promise<Trader[]> {
    const response = await fetch('/api/traders');
    const data = await response.json();
    return data.success ? data.data : [];
  },

  async getTrader(phone: string): Promise<Trader | null> {
    const response = await fetch(`/api/traders/${phone}`);
    const data = await response.json();
    return data.success ? data.data.trader : null;
  },


  async updateTrader(phone: string, updates: Partial<Omit<Trader, 'phone' | 'createdAt'>>): Promise<Trader | null> {
    const response = await fetch(`/api/traders/${phone}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    return data.success ? data.data : null;
  },

  async deleteTrader(phone: string): Promise<boolean> {
    const response = await fetch(`/api/traders/${phone}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    return data.success;
  },

  // Users
  async getUsers(): Promise<User[]> {
    const response = await fetch('/api/mikrotik/users');
    const data = await response.json();
    return data.success ? data.data : [];
  },

  async getTraderUsers(traderPhone: string): Promise<User[]> {
    const response = await fetch(`/api/traders/${traderPhone}/users`);
    const data = await response.json();
    return data.success ? data.data : [];
  },

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User | null> {
    const response = await fetch('/api/mikrotik/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await response.json();
    return data.success ? data.data : null;
  },

  async createTraderUser(traderPhone: string, user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'traderPhone'>): Promise<User | null> {
    const response = await fetch(`/api/traders/${traderPhone}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await response.json();
    return data.success ? data.data : null;
  },

  // Sessions
  async getSessions(): Promise<Session[]> {
    const response = await fetch('/api/mikrotik/sessions');
    const data = await response.json();
    return data.success ? data.data : [];
  },

  async getTraderSessions(traderPhone: string): Promise<Session[]> {
    const response = await fetch(`/api/traders/${traderPhone}/sessions`);
    const data = await response.json();
    return data.success ? data.data : [];
  },

  async createSession(session: Omit<Session, 'id' | 'startedAt'>): Promise<Session | null> {
    const response = await fetch('/api/mikrotik/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
    const data = await response.json();
    return data.success ? data.data : null;
  },

  async createTraderSession(traderPhone: string, session: Omit<Session, 'id' | 'startedAt' | 'traderPhone'>): Promise<Session | null> {
    const response = await fetch(`/api/traders/${traderPhone}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
    const data = await response.json();
    return data.success ? data.data : null;
  },

  // Credits
  async addCredit(traderPhone: string, amount: number, description?: string): Promise<boolean> {
    const response = await fetch('/api/credits/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traderPhone, amount, description })
    });
    const data = await response.json();
    return data.success;
  },

  // Vouchers
  async createVoucher(traderPhone: string, duration: 'hour' | 'day' | 'week' | 'month', quantity: number = 1, username?: string, password?: string): Promise<Voucher | null> {
    const response = await fetch('/api/vouchers/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traderPhone, duration, quantity, username, password })
    });
    const data = await response.json();
    return data.success ? data.data.user : null;
  },

  // Pricing
  async updatePricing(traderPhone: string, pricing: { hour: number; day: number; week: number; month: number }): Promise<boolean> {
    const response = await fetch(`/api/traders/${traderPhone}/pricing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pricing)
    });
    const data = await response.json();
    return data.success;
  },

  async getPricing(traderPhone: string): Promise<{ hour: number; day: number; week: number; month: number } | null> {
    const response = await fetch(`/api/traders/${traderPhone}/pricing`);
    const data = await response.json();
    return data.success ? data.data : null;
  },

  // Clients
  async getTraderClients(traderPhone: string): Promise<any[]> {
    const response = await fetch(`/api/clients/trader/${traderPhone}`);
    const data = await response.json();
    return data.success ? data.data : [];
  },

  async getAllClients(): Promise<any[]> {
    const response = await fetch('/api/clients');
    const data = await response.json();
    return data.success ? data.data : [];
  },

  // Reports
  async getTraderReports(traderPhone: string): Promise<any> {
    const response = await fetch(`/api/reports/trader/${traderPhone}`);
    const data = await response.json();
    return data.success ? data.data : null;
  },

  async getOwnerReports(): Promise<any> {
    const response = await fetch('/api/reports/owner');
    const data = await response.json();
    return data.success ? data.data : null;
  },

  async createTrader(traderData: any): Promise<Trader> {
    const response = await fetch('/api/traders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(traderData),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  // MikroTik management
  async getMikroTiks(): Promise<any[]> {
    const response = await fetch('/api/mikrotiks');
    const data = await response.json();
    return data.success ? data.data : [];
  },

  async getMikroTik(id: string): Promise<any> {
    const response = await fetch(`/api/mikrotiks/${id}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async createMikroTik(mikrotikData: any): Promise<any> {
    const response = await fetch('/api/mikrotiks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mikrotikData),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async updateMikroTik(id: string, mikrotikData: any): Promise<any> {
    const response = await fetch(`/api/mikrotiks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mikrotikData),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async deleteMikroTik(id: string): Promise<boolean> {
    const response = await fetch(`/api/mikrotiks/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return true;
  },

  // Real MikroTik data methods
  async getRealMikroTikUsers(): Promise<any[]> {
    const response = await fetch('/api/mikrotik/users');
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async getRealMikroTikSessions(): Promise<any[]> {
    const response = await fetch('/api/mikrotik/sessions');
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async disconnectRealSession(sessionId: string): Promise<boolean> {
    const response = await fetch(`/api/mikrotik/sessions?sessionId=${sessionId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return true;
  },

  // Discount calculations
  async calculateDiscountedPrice(traderPhone: string, category: 'hour' | 'day' | 'week' | 'month', basePrice: number): Promise<{ finalPrice: number; appliedDiscount?: any; originalPrice: number }> {
    const response = await fetch(`/api/traders/${traderPhone}/discounts/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, basePrice })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }
};
