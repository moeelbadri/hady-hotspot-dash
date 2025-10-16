// Multi-MikroTik API Integration for Multi-Tenant Hotspot Management
import { RouterOSAPI } from 'routeros-api';

export interface MikroTikRouter {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  location?: string;
  status?: 'online' | 'offline' | 'error';
  lastSeen?: Date;
}

export interface Trader {
  id: string; // Phone number
  name: string;
  phone: string;
  routerId: string;
  hotspotName: string; // Same as phone number
  status?: 'active' | 'inactive' | 'suspended';
  plan: string;
  createdAt: Date;
  lastActivity?: Date;
}

export interface HotspotUser {
  id: string;
  name: string;
  password: string;
  profile: string;
  limitBytesIn: string;
  limitBytesOut: string;
  limitUptime: string;
  disabled: boolean;
  comment?: string;
  traderId: string; // Phone number of trader
  routerId: string;
}

export interface ActiveSession {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: string;
  bytesOut: string;
  server: string;
  traderId: string;
  routerId: string;
}

// Global MikroTik clients pool
const globalClients = new Map<string, RouterOSAPI>();
const isConnecting = new Map<string, boolean>();

// Initialize connection to specific MikroTik router
async function getMikroTikClient(routerId: string, routerConfig: MikroTikRouter): Promise<RouterOSAPI> {
  if (globalClients.has(routerId)) {
    const client = globalClients.get(routerId)!;
    if (client.connected) {
      return client;
    }
  }

  if (isConnecting.get(routerId)) {
    // Wait for existing connection attempt
    while (isConnecting.get(routerId)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (globalClients.has(routerId)) {
      const client = globalClients.get(routerId)!;
      if (client.connected) {
        return client;
      }
    }
  }

  isConnecting.set(routerId, true);

  try {
    const client = new RouterOSAPI({
      host: routerConfig.host,
      user: routerConfig.username,
      password: routerConfig.password,
      port: routerConfig.port,
      keepalive: true,
      timeout: 10000,
    });

    await client.connect();
    globalClients.set(routerId, client);
    
    return client;
  } catch (error) {
    console.error(`❌ Failed to connect to MikroTik ${routerConfig.name}:`, error);
    throw error;
  } finally {
    isConnecting.set(routerId, false);
  }
}

class MultiMikroTikAPI {
  private routers: Map<string, MikroTikRouter> = new Map();
  private traders: Map<string, Trader> = new Map();

  constructor() {
    this.loadRoutersFromEnv();
  }

  // Load routers from environment variables
  private loadRoutersFromEnv() {
    // Example: MIKROTIK_ROUTERS=router1:192.168.1.1:8728:admin:pass1,router2:192.168.2.1:8728:admin:pass2
    const routersConfig = process.env.MIKROTIK_ROUTERS || '';
    
    if (routersConfig) {
      const routers = routersConfig.split(',').map(routerStr => {
        const [id, host, port, username, password] = routerStr.split(':');
        return {
          id,
          host,
          port: parseInt(port),
          username,
          password,
          name: `Router ${id}`,
          location: `Location ${id}`,
          status: 'offline' as const
        };
      });

      routers.forEach(router => {
        this.routers.set(router.id, router);
      });
    }
  }

  // Add new router
  async addRouter(router: MikroTikRouter): Promise<void> {
    this.routers.set(router.id, router);
    // Test connection
    await this.testRouterConnection(router.id);
  }

  // Test router connection
  async testRouterConnection(routerId: string): Promise<boolean> {
    const router = this.routers.get(routerId);
    if (!router) {
      throw new Error(`Router ${routerId} not found`);
    }

    try {
      const client = await getMikroTikClient(routerId, router);
      await client.write('/system/identity/print');
      router.status = 'online';
      router.lastSeen = new Date();
      return true;
    } catch (error) {
      router.status = 'error';
      console.error(`Router ${routerId} connection failed:`, error);
      return false;
    }
  }

  // Get all routers
  getRouters(): MikroTikRouter[] {
    return Array.from(this.routers.values());
  }

  // Get router by ID
  getRouter(routerId: string): MikroTikRouter | undefined {
    return this.routers.get(routerId);
  }

  // Add new trader
  async addTrader(trader: Omit<Trader, 'createdAt'>): Promise<void> {
    const newTrader: Trader = {
      ...trader,
      createdAt: new Date()
    };

    this.traders.set(trader.id, newTrader);

    // Create hotspot user on the router
    const router = this.routers.get(trader.routerId);
    if (!router) {
      throw new Error(`Router ${trader.routerId} not found`);
    }

    try {
      const client = await getMikroTikClient(trader.routerId, router);
      
      // Create hotspot user with trader's phone as username
      await client.write('/ip/hotspot/user/add', [
        `name=${trader.phone}`,
        `password=${trader.phone}`, // Use phone as password too
        'profile=default',
        `comment=Trader: ${trader.name} (${trader.phone})`
      ]);

    } catch (error) {
      console.error(`❌ Failed to add trader ${trader.name}:`, error);
      throw error;
    }
  }

  // Get all traders
  getTraders(): Trader[] {
    return Array.from(this.traders.values());
  }

  // Get traders by router
  getTradersByRouter(routerId: string): Trader[] {
    return Array.from(this.traders.values()).filter(trader => trader.routerId === routerId);
  }

  // Get trader by phone
  getTraderByPhone(phone: string): Trader | undefined {
    return this.traders.get(phone);
  }

  // Get hotspot users for a specific trader
  async getTraderUsers(traderId: string): Promise<HotspotUser[]> {
    const trader = this.traders.get(traderId);
    if (!trader) {
      throw new Error(`Trader ${traderId} not found`);
    }

    const router = this.routers.get(trader.routerId);
    if (!router) {
      throw new Error(`Router ${trader.routerId} not found`);
    }

    try {
      const client = await getMikroTikClient(trader.routerId, router);
      const response = await client.write('/ip/hotspot/user/print');
      
      return response
        .filter((user: any) => user.comment?.includes(traderId))
        .map((user: any) => ({
          id: user['.id'],
          name: user.name,
          password: user.password,
          profile: user.profile,
          limitBytesIn: user['limit-bytes-in'] || '0',
          limitBytesOut: user['limit-bytes-out'] || '0',
          limitUptime: user['limit-uptime'] || '0',
          disabled: user.disabled === 'true',
          comment: user.comment || '',
          traderId,
          routerId: trader.routerId,
        }));
    } catch (error) {
      console.error(`Error fetching users for trader ${traderId}:`, error);
      throw error;
    }
  }

  // Get active sessions for a specific trader
  async getTraderSessions(traderId: string): Promise<ActiveSession[]> {
    const trader = this.traders.get(traderId);
    if (!trader) {
      throw new Error(`Trader ${traderId} not found`);
    }

    const router = this.routers.get(trader.routerId);
    if (!router) {
      throw new Error(`Router ${trader.routerId} not found`);
    }

    try {
      const client = await getMikroTikClient(trader.routerId, router);
      const response = await client.write('/ip/hotspot/active/print');
      
      return response
        .filter((session: any) => session.user === trader.phone)
        .map((session: any) => ({
          id: session['.id'],
          user: session.user,
          address: session.address,
          macAddress: session['mac-address'],
          uptime: session.uptime,
          bytesIn: session['bytes-in'],
          bytesOut: session['bytes-out'],
          server: session.server,
          traderId,
          routerId: trader.routerId,
        }));
    } catch (error) {
      console.error(`Error fetching sessions for trader ${traderId}:`, error);
      throw error;
    }
  }

  // Create hotspot user for trader's client
  async createTraderUser(traderId: string, userData: {
    name: string;
    password: string;
    profile?: string;
    limitBytesIn?: string;
    limitBytesOut?: string;
    limitUptime?: string;
  }): Promise<any> {
    const trader = this.traders.get(traderId);
    if (!trader) {
      throw new Error(`Trader ${traderId} not found`);
    }

    const router = this.routers.get(trader.routerId);
    if (!router) {
      throw new Error(`Router ${trader.routerId} not found`);
    }

    try {
      const client = await getMikroTikClient(trader.routerId, router);
      
      const params = [
        `name=${userData.name}`,
        `password=${userData.password}`,
        `profile=${userData.profile || 'default'}`,
        `limit-bytes-in=${userData.limitBytesIn || '0'}`,
        `limit-bytes-out=${userData.limitBytesOut || '0'}`,
        `limit-uptime=${userData.limitUptime || '0'}`,
        `comment=Client of trader ${traderId}`
      ];

      return await client.write('/ip/hotspot/user/add', params);
    } catch (error) {
      console.error(`Error creating user for trader ${traderId}:`, error);
      throw error;
    }
  }

  // Disconnect trader's session
  async disconnectTraderSession(traderId: string, sessionId: string): Promise<any> {
    const trader = this.traders.get(traderId);
    if (!trader) {
      throw new Error(`Trader ${traderId} not found`);
    }

    const router = this.routers.get(trader.routerId);
    if (!router) {
      throw new Error(`Router ${trader.routerId} not found`);
    }

    try {
      const client = await getMikroTikClient(trader.routerId, router);
      return await client.write('/ip/hotspot/active/remove', [`.id=${sessionId}`]);
    } catch (error) {
      console.error(`Error disconnecting session for trader ${traderId}:`, error);
      throw error;
    }
  }

  // Get system overview
  async getSystemOverview(): Promise<{
    totalRouters: number;
    onlineRouters: number;
    totalTraders: number;
    activeTraders: number;
    totalSessions: number;
  }> {
    const routers = this.getRouters();
    const traders = this.getTraders();
    
    let totalSessions = 0;
    let onlineRouters = 0;

    for (const router of routers) {
      if (router.status === 'online') {
        onlineRouters++;
        try {
          const client = await getMikroTikClient(router.id, router);
          const sessions = await client.write('/ip/hotspot/active/print');
          totalSessions += sessions.length;
        } catch (error) {
          console.error(`Error getting sessions for router ${router.id}:`, error);
        }
      }
    }

    return {
      totalRouters: routers.length,
      onlineRouters,
      totalTraders: traders.length,
      activeTraders: traders.filter(t => t.status === 'active').length,
      totalSessions
    };
  }

  // Close all connections
  async closeAllConnections(): Promise<void> {
    for (const [routerId, client] of globalClients) {
      try {
        await client.close();
      } catch (error) {
        console.error(`❌ Error closing connection for router ${routerId}:`, error);
      }
    }
    globalClients.clear();
  }
}

// Export singleton instance
export const multiMikroTikAPI = new MultiMikroTikAPI();
export { getMikroTikClient };
