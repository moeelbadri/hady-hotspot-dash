// MikroTik API Integration using routeros-api library
import { RosApiMenu, RouterOSAPI } from 'routeros-api';
import { RouterOSClient } from 'routeros-api';

export interface MikroTikConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL?: boolean;
}

export interface MikroTikDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  macAddress: string;
  bytesIn: string;
  bytesOut: string;
  uptime: string;
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
}

// Connection interfaces
interface MikroTikConnections {
  api: RouterOSAPI | null;
  client: RouterOSClient | null;
  isConnecting: boolean;
  lastUsed: Date;
}

// Connection manager for multiple MikroTik devices
class MikroTikConnectionManager {
  private connections: Map<string, MikroTikConnections> = new Map();
  private maxConnections: number = 10;
  private connectionTimeout: number = 30000; // 30 seconds

  // Get or create connections for a device
  async getConnections(deviceId: string, device: MikroTikDevice): Promise<MikroTikConnections> {
    let connections = this.connections.get(deviceId);
    
    if (!connections) {
      connections = {
        api: null,
        client: null,
        isConnecting: false,
        lastUsed: new Date()
      };
      this.connections.set(deviceId, connections);
    }

    // Update last used time
    connections.lastUsed = new Date();

    // Clean up old connections if we have too many
    this.cleanupOldConnections();

    return connections;
  }

  // Get API connection for a device
  async getAPIConnection(deviceId: string, device: MikroTikDevice): Promise<RouterOSAPI> {
    const connections = await this.getConnections(deviceId, device);
    
    if (connections.api && connections.api.connected) {
      return connections.api;
    }

    if (connections.isConnecting) {
      // Wait for existing connection attempt
      while (connections.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (connections.api && connections.api.connected) {
        return connections.api;
      }
    }

    connections.isConnecting = true;

    try {
      const config = {
        host: device.host,
        user: device.username,
        password: device.password,
        port: device.port,
        keepalive: true,
        timeout: 60000,
      };

      connections.api = new RouterOSAPI(config);
      await connections.api.connect();
      
      return connections.api;
    } catch (error) {
      console.error(`❌ Failed to connect API to MikroTik ${device.name}:`, error);
      connections.api = null;
      throw error;
    } finally {
      connections.isConnecting = false;
    }
  }

  // Get client connection for a device
  async getClientConnection(deviceId: string, device: MikroTikDevice): Promise<RosApiMenu> {
    const connections = await this.getConnections(deviceId, device);
    
    if (connections.client && connections.client.isConnected()) {
      return await connections.client.connect();
    }

    if (connections.isConnecting) {
      // Wait for existing connection attempt
      while (connections.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (connections.client && connections.client.isConnected()) {
        return await connections.client.connect();
      }
    }

    connections.isConnecting = true;

    try {
      const config = {
        host: device.host,
        user: device.username,
        password: device.password,
        port: device.port,
        keepalive: true,
        timeout: 60000,
      };

      connections.client = new RouterOSClient(config);
      await connections.client.connect();
      
      return await connections.client.connect();
    } catch (error) {
      console.error(`❌ Failed to connect Client to MikroTik ${device.name}:`, error);
      connections.client = null;
      throw error;
    } finally {
      connections.isConnecting = false;
    }
  }

  // Close connections for a specific device
  async closeDeviceConnections(deviceId: string): Promise<void> {
    const connections = this.connections.get(deviceId);
    if (!connections) return;

    try {
      if (connections.api) {
        await connections.api.close();
      }
      if (connections.client) {
        await connections.client.close();
      }
    } catch (error) {
      console.error(`❌ Error closing connections for device ${deviceId}:`, error);
    } finally {
      this.connections.delete(deviceId);
    }
  }

  // Close all connections
  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.keys()).map(deviceId => 
      this.closeDeviceConnections(deviceId)
    );
    await Promise.all(closePromises);
    this.connections.clear();
  }

  // Clean up old connections
  private cleanupOldConnections(): void {
    if (this.connections.size <= this.maxConnections) return;

    const now = new Date();
    const entries = Array.from(this.connections.entries());
    
    // Sort by last used time (oldest first)
    entries.sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime());
    
    // Remove oldest connections
    const toRemove = entries.slice(0, entries.length - this.maxConnections);
    toRemove.forEach(([deviceId]) => {
      this.closeDeviceConnections(deviceId);
    });
  }

  // Get connection status for all devices
  getConnectionStatus(): Record<string, { api: boolean; client: boolean; lastUsed: Date }> {
    const status: Record<string, { api: boolean; client: boolean; lastUsed: Date }> = {};
    
    this.connections.forEach((connections, deviceId) => {
      status[deviceId] = {
        api: connections.api?.connected || false,
        client: connections.client?.isConnected() || false,
        lastUsed: connections.lastUsed
      };
    });
    
    return status;
  }
}

// Global connection manager instance
const connectionManager = new MikroTikConnectionManager();

class MikroTikAPI {
  private device: MikroTikDevice;

  constructor(device: MikroTikDevice) {
    this.device = device;
  }

  // Get API connection for this device
  async getAPIConnection(): Promise<RouterOSAPI> {
    return await connectionManager.getAPIConnection(this.device.id, this.device);
  }

  // Get client connection for this device
  async getClientConnection(): Promise<RosApiMenu> {
    return await connectionManager.getClientConnection(this.device.id, this.device);
  }

  // Send API command
  async sendCommand(command: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const client = await this.getAPIConnection();
      // Convert params to key=value format
      const paramArray = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${value}`);
      const result = await client.write(command, paramArray);
      return result;
    } catch (error) {
      console.error(`Command failed for device ${this.device.name}:`, command, error);
      throw error;
    }
  }

  // Get all hotspot users
  async getHotspotUsers(): Promise<HotspotUser[]> {
    try {
      const response = await this.sendCommand('/ip/hotspot/user/print');

      return response.map((user: any) => ({
        id: user['.id'],
        name: user.name,
        password: user.password,
        profile: user.profile,
        macAddress: user['mac-address'],
        limitBytesIn: user['limit-bytes-in'] || '0',
        bytesIn: user['bytes-in'] || '0',
        limitBytesOut: user['limit-bytes-out'] || '0',
        bytesOut: user['bytes-out'] || '0',
        limitUptime: user['limit-uptime'] || '0',
        uptime: user['uptime'] || '0',
        disabled: user.disabled === 'true',
        comment: user.comment || '',
      }));
    } catch (error) {
      console.error('Error fetching hotspot users:', error);
      throw error;
    }
  }

  // Create new hotspot user
  async createHotspotUser(userData: Partial<HotspotUser>): Promise<any> {
    try {
      const params = {
        name: userData.name,
        password: userData.password,
        profile: userData.profile || 'default',
        'limit-bytes-in': userData.limitBytesIn || '0',                                                                                                                                                                                                                                                                                                      
        'limit-bytes-out': userData.limitBytesOut || '0',
        'limit-uptime': userData.limitUptime || '0',
        disabled: userData.disabled ? 'true' : 'false',
        comment: userData.comment || '',
      };

      return await this.sendCommand('/ip/hotspot/user/add', params);
    } catch (error) {
      console.error('Error creating hotspot user:', error);
      throw error;
    }
  }

  // Update hotspot user
  async updateHotspotUser(userId: string, userData: Partial<HotspotUser>): Promise<any> {
    try {
      const params = {
        ...userData,
        'limit-bytes-in': userData.limitBytesIn,
        'limit-bytes-out': userData.limitBytesOut,
        'limit-uptime': userData.limitUptime,
        disabled: userData.disabled ? 'true' : 'false',
      };

      return await this.sendCommand('/ip/hotspot/user/set', { '.id': userId, ...params });
    } catch (error) {
      console.error('Error updating hotspot user:', error);
      throw error;
    }
  }

  // Delete hotspot user
  async deleteHotspotUser(userId: string): Promise<any> {
    try {
      return await this.sendCommand('/ip/hotspot/user/remove', { '.id': userId });
    } catch (error) {
      console.error('Error deleting hotspot user:', error);
      throw error;
    }
  }

  // Get active hotspot sessions
  async getActiveSessions(): Promise<ActiveSession[]> {
    try {
      const response = await this.sendCommand('/ip/hotspot/active/print');
      
      return response.map((session: any) => ({
        id: session['.id'],
        user: session.user,
        address: session.address,
        macAddress: session['mac-address'],
        uptime: session.uptime,
        bytesIn: session['bytes-in'],
        bytesOut: session['bytes-out'],
        server: session.server,
      }));
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      throw error;
    }
  }

  // Disconnect user session
  async disconnectSession(sessionId: string): Promise<any> {
    try {
      return await this.sendCommand('/ip/hotspot/active/remove', { '.id': sessionId });
    } catch (error) {
      console.error('Error disconnecting session:', error);
      throw error;
    }
  }

  // Get hotspot server info
  async getHotspotServers(): Promise<any[]> {
    try {
      return await this.sendCommand('/ip/hotspot/print');
    } catch (error) {
      console.error('Error fetching hotspot servers:', error);
      throw error;
    }
  }

  // Get user profiles
  async getUserProfiles(): Promise<any[]> {
    try {
      return await this.sendCommand('/ip/hotspot/user/profile/print');
    } catch (error) {
      console.error('Error fetching user profiles:', error);
      throw error;
    }
  }

  // Get all interfaces
  async getInterfaces(): Promise<any[]> {
    try {
      const response = await this.sendCommand('/interface/print');
      return response || [];
    } catch (error) {
      console.error('Error fetching interfaces:', error);
      throw error;
    }
  }

  // Get available ethernet interfaces (not slave, not running)
  async getAvailableEthernetPorts(): Promise<any[]> {
    try {
      const interfaces = await this.getInterfaces();
      
      // Filter for ethernet interfaces that are:
      // 1. Type is ether or ethernet
      // 2. Not a slave (no master property or master is empty)
      // 3. Not running (running is false or not set)
      const available = interfaces.filter((iface: any) => {
        const type = (iface.type || '').toLowerCase();
        const isEthernet = type === 'ether' || type === 'ethernet' || type.includes('ether');
    
        const isSlave = iface.slave === 'true' || iface.slave === true;
        const isRunning = iface.running === 'true' || iface.running === true;
        const isDisabled = iface.disabled === 'true' || iface.disabled === true;
        
        return isEthernet && !isSlave && !isRunning && !isDisabled;
      });
      
      return available.map((iface: any) => ({
        id: iface['.id'],
        name: iface.name,
        type: iface.type,
        macAddress: iface['mac-address'] || '',
        defaultName: iface['default-name'] || '',
        comment: iface.comment || '',
        disabled: iface.disabled === 'true' || iface.disabled === true,
        running: iface.running === 'true' || iface.running === true,
        master: iface.master || '',
      }));
    } catch (error) {
      console.error('Error fetching available ethernet ports:', error);
      throw error;
    }
  }

  // Get highest hotspot IP address with comment "hotspot-hady"
  // Returns IP block: "172.30.10." if none found, or "172.31.10." if IPs found
  async getHighestHotspotIP(comment: string = 'Trader:'): Promise<string> {
    try {
      const ipAddresses: string[] = [];
      // Check IP pool addresses (if pool has individual address tracking)
      try {
        const ipPools = await this.sendCommand('/ip/pool/print');
        ipPools.forEach((pool: any) => {
          if (pool.comment && pool.comment.includes(comment)) {
            console.log(pool,'pool');
            const iprange = pool.ranges.split('-')[0];
            // add 1 to the ip range 172.30.10. to 172.30.11. and return it remove the last octet and add 1
            const ip = iprange.split('.');
            console.log(ip);
            ip[3] = '';
            ip[2] = (parseInt(ip[2]) + 1).toString();
            ipAddresses.push(ip.join('.'));
            return ipAddresses[0];
          }
        });
      } catch (error) {
        console.warn('Could not fetch IP pools:', error);
      }
      console.log(`✅ IP addresses: ${ipAddresses}`);
      // If none found, return base IP block 172.30.10.
      if (ipAddresses.length === 0) {
        return '172.30.10.';
      }

      // If IPs found, increment second octet from 30 to 31, return 172.31.10.
      return ipAddresses[0];
    } catch (error) {
      console.error('Error fetching highest hotspot IP:', error);
      // On error, return base IP block
      return '172.30.10.';
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.sendCommand('/system/identity/print');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Factory function to create API instance for a specific device
export function createMikroTikAPI(device: MikroTikDevice): MikroTikAPI {
  return new MikroTikAPI(device);
}

// Load devices from database
async function loadDevicesFromDatabase(): Promise<MikroTikDevice[]> {
  try {
    const { DatabaseService } = await import('./database');
    const mikrotiks = await DatabaseService.getAllMikroTiks();
    const traders = await DatabaseService.getAllTraders();
    
    // Create a map of mikrotik_id to traders
    const tradersByMikrotik = new Map();
    traders.forEach((trader: any) => {
      if (trader.mikrotik_id) {
        if (!tradersByMikrotik.has(trader.mikrotik_id)) {
          tradersByMikrotik.set(trader.mikrotik_id, []);
        }
        tradersByMikrotik.get(trader.mikrotik_id).push({
          phone: trader.phone,
          name: trader.name,
          hotspot_name: trader.hotspot_name
        });
      }
    });
    
    // Convert mikrotiks to MikroTikDevice format
    const devices = mikrotiks.map((mikrotik: any) => ({
      id: mikrotik.id,
      name: mikrotik.name,
      host: mikrotik.host,
      username: mikrotik.username,
      password: mikrotik.password,
      port: mikrotik.port,
      isActive: mikrotik.is_active,
      traders: tradersByMikrotik.get(mikrotik.id) || []
    }));
    
    return devices;
  } catch (error) {
    console.error('Error loading MikroTik devices from database:', error);
    return [];
  }
}

// Get API instance for a device by ID
export async function getMikroTikAPI(deviceId: string): Promise<MikroTikAPI> {
  const devices = await loadDevicesFromDatabase();
  const device = devices.find(d => d.id === deviceId);
  
  if (!device) {
    throw new Error(`MikroTik device with ID ${deviceId} not found`);
  }
  
  return new MikroTikAPI(device);
}

// Get all active MikroTik devices
export async function getAllMikroTikDevices(): Promise<MikroTikDevice[]> {
  const devices = await loadDevicesFromDatabase();
  return devices.filter(device => device.isActive);
}

// Get MikroTik device by ID
export async function getMikroTikDevice(deviceId: string): Promise<MikroTikDevice | null> {
  const devices = await loadDevicesFromDatabase();
  return devices.find(d => d.id === deviceId) || null;
}

// Connection management functions
export async function closeMikroTikConnection(deviceId?: string): Promise<void> {
  if (deviceId) {
    await connectionManager.closeDeviceConnections(deviceId);
  } else {
    await connectionManager.closeAllConnections();
  }
}

// Get connection status for all devices
export function getMikroTikConnectionStatus(): Record<string, { api: boolean; client: boolean; lastUsed: Date }> {
  return connectionManager.getConnectionStatus();
}

// Test connection for a specific device
export async function testMikroTikConnection(device: MikroTikDevice): Promise<boolean> {
  try {
    const api = new MikroTikAPI(device);
    return await api.testConnection();
  } catch (error) {
    console.error(`Connection test failed for device ${device.name}:`, error);
    return false;
  }
}


// Execute command on all active devices
export async function executeOnAllDevices<T>(
  command: (api: MikroTikAPI) => Promise<T>
): Promise<Record<string, T | Error>> {
  const devices = await getAllMikroTikDevices();
  const results: Record<string, T | Error> = {};
  
  const promises = devices.map(async (device) => {
    try {
      const api = new MikroTikAPI(device);
      const result = await command(api);
      results[device.id] = result;
    } catch (error) {
      results[device.id] = error as Error;
    }
  });
  
  await Promise.all(promises);
  return results;
}

// Get hotspot users from all devices
export async function getAllHotspotUsers(): Promise<Record<string, HotspotUser[]>> {
  const results = await executeOnAllDevices(async (api) => {
    return await api.getHotspotUsers();
  });
  
  // Filter out errors and return only successful results
  const filteredResults: Record<string, HotspotUser[]> = {};
  Object.entries(results).forEach(([deviceId, result]) => {
    if (!(result instanceof Error)) {
      filteredResults[deviceId] = result;
    }
  });
  
  return filteredResults;
}

// Get active sessions from all devices
export async function getAllActiveSessions(): Promise<Record<string, ActiveSession[]>> {
  const results = await executeOnAllDevices(async (api) => {
    return await api.getActiveSessions();
  });
  
  // Filter out errors and return only successful results
  const filteredResults: Record<string, ActiveSession[]> = {};
  Object.entries(results).forEach(([deviceId, result]) => {
    if (!(result instanceof Error)) {
      filteredResults[deviceId] = result;
    }
  });
  
  return filteredResults;
}


// Get client connection for a specific device
export async function getMikroTikClient(deviceId: string): Promise<RosApiMenu> {
  const devices = await loadDevicesFromDatabase();
  
  const device = devices.find(d => d.id === deviceId) || devices.find(d => d.host === deviceId);
  if (!device) {
    console.error('❌ Device not found. Looking for:', deviceId);
    console.error('❌ Available devices:', devices.map(d => ({ id: d.id, name: d.name, host: d.host })));
    throw new Error(`MikroTik device with ID ${deviceId} not found`);
  }
  
  return await connectionManager.getClientConnection(deviceId, device);
}

