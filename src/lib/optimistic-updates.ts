// Optimistic updates and selective data refresh utilities
// This helps avoid full dashboard reloads by updating only specific data

export interface OptimisticUpdate {
  type: 'voucher_created' | 'credit_added' | 'trader_updated' | 'user_created' | 'session_created';
  data: any;
  timestamp: number;
}

export class OptimisticUpdateManager {
  private static instance: OptimisticUpdateManager;
  private updates: OptimisticUpdate[] = [];

  static getInstance(): OptimisticUpdateManager {
    if (!OptimisticUpdateManager.instance) {
      OptimisticUpdateManager.instance = new OptimisticUpdateManager();
    }
    return OptimisticUpdateManager.instance;
  }

  addUpdate(update: OptimisticUpdate): void {
    this.updates.push(update);
    // Keep only last 50 updates to prevent memory issues
    if (this.updates.length > 50) {
      this.updates = this.updates.slice(-50);
    }
  }

  getUpdates(): OptimisticUpdate[] {
    return [...this.updates];
  }

  clearUpdates(): void {
    this.updates = [];
  }
}

// Optimistic update functions for different operations
export const optimisticUpdates = {
  // Voucher creation - update trader credit and stats optimistically
  voucherCreated: (traderPhone: string, voucher: any, oldCredit: number) => {
    const updateManager = OptimisticUpdateManager.getInstance();
    updateManager.addUpdate({
      type: 'voucher_created',
      data: {
        traderPhone,
        voucher,
        newCredit: oldCredit - voucher.price,
        oldCredit
      },
      timestamp: Date.now()
    });
  },

  // Credit addition - update trader credit optimistically
  creditAdded: (traderPhone: string, amount: number, oldCredit: number) => {
    const updateManager = OptimisticUpdateManager.getInstance();
    updateManager.addUpdate({
      type: 'credit_added',
      data: {
        traderPhone,
        amount,
        newCredit: oldCredit + amount,
        oldCredit
      },
      timestamp: Date.now()
    });
  },

  // Trader update - update trader data optimistically
  traderUpdated: (traderPhone: string, updates: any) => {
    const updateManager = OptimisticUpdateManager.getInstance();
    updateManager.addUpdate({
      type: 'trader_updated',
      data: {
        traderPhone,
        updates
      },
      timestamp: Date.now()
    });
  }
};

// Selective data refresh functions
export const selectiveRefresh = {
  // Refresh only trader credit and stats
  refreshTraderStats: async (traderPhone: string) => {
    try {
      const [trader, reports] = await Promise.all([
        fetch(`/api/traders/${traderPhone}`).then(res => res.json()),
        fetch(`/api/reports/trader/${traderPhone}`).then(res => res.json())
      ]);
      
      return {
        trader: trader.success ? trader.data.trader : null,
        reports: reports.success ? reports.data : null
      };
    } catch (error) {
      console.error('Error refreshing trader stats:', error);
      return null;
    }
  },

  // Refresh only dashboard stats (for owner dashboard)
  refreshDashboardStats: async () => {
    try {
      const [traders, sessions] = await Promise.all([
        fetch('/api/traders').then(res => res.json()),
        fetch('/api/mikrotik/sessions').then(res => res.json())
      ]);
      
      if (traders.success && sessions.success) {
        const totalCredit = traders.data.reduce((sum: number, trader: any) => sum + trader.credit, 0);
        const activeSessions = sessions.data.length;
        
        return {
          totalTraders: traders.data.length,
          activeTraders: traders.data.filter((t: any) => t.isActive).length,
          totalCredit,
          activeSessions
        };
      }
      return null;
    } catch (error) {
      console.error('Error refreshing dashboard stats:', error);
      return null;
    }
  },

  // Refresh only specific trader data
  refreshTraderData: async (traderPhone: string) => {
    try {
      const [trader, users, sessions, reports] = await Promise.all([
        fetch(`/api/traders/${traderPhone}`).then(res => res.json()),
        fetch(`/api/traders/${traderPhone}/users`).then(res => res.json()),
        fetch(`/api/traders/${traderPhone}/sessions`).then(res => res.json()),
        fetch(`/api/reports/trader/${traderPhone}`).then(res => res.json())
      ]);

      return {
        trader: trader.success ? trader.data.trader : null,
        users: users.success ? users.data : [],
        sessions: sessions.success ? sessions.data : [],
        reports: reports.success ? reports.data : null
      };
    } catch (error) {
      console.error('Error refreshing trader data:', error);
      return null;
    }
  }
};

// Hook for managing optimistic updates in React components
export const useOptimisticUpdates = () => {
  const updateManager = OptimisticUpdateManager.getInstance();
  
  const applyOptimisticUpdate = (update: OptimisticUpdate) => {
    updateManager.addUpdate(update);
  };

  const getOptimisticUpdates = () => {
    return updateManager.getUpdates();
  };

  const clearOptimisticUpdates = () => {
    updateManager.clearUpdates();
  };

  return {
    applyOptimisticUpdate,
    getOptimisticUpdates,
    clearOptimisticUpdates
  };
};
