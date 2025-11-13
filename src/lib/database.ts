import { SQL } from "bun";


// Initialize SQLite database connection
const db = new SQL("sqlite://hady_hotspot.db");

// Enable foreign key constraints
db`PRAGMA foreign_keys = ON;`;

export { db };

// Database utility functions
export class DatabaseService {
  // Auth Users
  static async createAuthUser(userData: {
    username: string;
    password: string;
    type: 'owner' | 'trader';
    name: string;
    phone?: string;
  }) {
    return await db`
      INSERT INTO auth_users (id, username, password, type, name, phone, is_active)
      VALUES (${userData.username}, ${userData.username}, ${userData.password}, ${userData.type}, ${userData.name}, ${userData.phone || null}, ${true})
      RETURNING *
    `;
  }

  static async getAuthUser(username: string) {
    const [user] = await db`
      SELECT * FROM auth_users 
      WHERE (username = ${username} OR name = ${username}) AND is_active = ${true}
    `;
    return user;
  }

  static async getAuthUserById(id: string) {
    const [user] = await db`
      SELECT * FROM auth_users 
      WHERE id = ${id} AND is_active = ${true}
    `;
    return user;
  }

  // Traders
  static async createTrader(traderData: {
    phone: string;
    name: string;
    hotspot_name: string;
    mikrotik_id: string;
  }) {
    return await db`
      INSERT INTO traders (phone, name, hotspot_name, mikrotik_id)
      VALUES (${traderData.phone}, ${traderData.name}, ${traderData.hotspot_name}, 
              ${traderData.mikrotik_id})
      RETURNING *
    `;
  }

  // Legacy method for backward compatibility - creates mikrotik and trader
  static async createTraderWithMikroTik(traderData: {
    phone: string;
    name: string;
    hotspot_name: string;
    mikrotik_host: string;
    mikrotik_username: string;
    mikrotik_password: string;
    mikrotik_port: number;
  })
{
    // First create the MikroTik router
    const mikrotik = await this.createMikroTik({
      name: traderData.hotspot_name + ' Router',
      host: traderData.mikrotik_host,
      username: traderData.mikrotik_username,
      password: traderData.mikrotik_password,
      port: traderData.mikrotik_port,
      description: 'Created for trader: ' + traderData.name
    });

    // Then create the trader with reference to the MikroTik
    return await this.createTrader({
      phone: traderData.phone,
      name: traderData.name,
      hotspot_name: traderData.hotspot_name,
      mikrotik_id: mikrotik.id
    });
  }

  static async getTrader(phone: string) {
    const [trader] = await db`
      SELECT t.*, m.name as mikrotik_name, m.host as mikrotik_host, 
             m.username as mikrotik_username, m.password as mikrotik_password, 
             m.port as mikrotik_port, m.description as mikrotik_description,
             p.hour_price, p.day_price, p.week_price, p.month_price
      FROM traders t
      LEFT JOIN mikrotiks m ON t.mikrotik_id = m.id
      LEFT JOIN trader_pricing p ON t.phone = p.trader_phone
      WHERE t.phone = ${phone} AND t.is_active = ${true}
    `;
    return trader;
  }

  static async getTraderWithMikroTik(phone: string) {
    const [trader] = await db`
      SELECT t.*, m.name as mikrotik_name, m.host as mikrotik_host, 
             m.username as mikrotik_username, m.password as mikrotik_password, 
             m.port as mikrotik_port, m.description as mikrotik_description,
             m.is_active as mikrotik_is_active
      FROM traders t
      LEFT JOIN mikrotiks m ON t.mikrotik_id = m.id
      WHERE t.phone = ${phone}
    `;
    return trader;
  }

  static async getAllTraders() {
    return await db`
      SELECT t.*, m.name as mikrotik_name, m.host as mikrotik_host, 
             m.username as mikrotik_username, m.password as mikrotik_password, 
             m.port as mikrotik_port, m.description as mikrotik_description,
             m.is_active as mikrotik_is_active,
             p.hour_price, p.day_price, p.week_price, p.month_price
      FROM traders t
      LEFT JOIN mikrotiks m ON t.mikrotik_id = m.id
      LEFT JOIN trader_pricing p ON t.phone = p.trader_phone
      ORDER BY t.created_at DESC
    `;
  }


  static async updateTrader(phone: string, updateData: {
    name?: string;
    hotspot_name?: string;
    mikrotik_id?: string;
    is_active?: boolean;
  }) {
    // Build dynamic update query
    const updates = [];
    const values = [];

    if (updateData.name !== undefined) {
      updates.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.hotspot_name !== undefined) {
      updates.push('hotspot_name = ?');
      values.push(updateData.hotspot_name);
    }
    if (updateData.mikrotik_id !== undefined) {
      updates.push('mikrotik_id = ?');
      values.push(updateData.mikrotik_id);
    }
    if (updateData.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(updateData.is_active);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    const setClause = updates.join(', ');
    const query = `UPDATE traders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE phone = ? RETURNING *`;
    
    return await db.unsafe(query, [...values, phone]);
  }

  static async deleteTrader(phone: string) {
    // Delete trader and all associated data (cascading deletes will handle related records including auth_users)
    return await db`
      DELETE FROM traders 
      WHERE phone = ${phone}
    `;
  }

  // Trader Pricing
  static async setTraderPricing(phone: string, pricing: {
    hour_price: number;
    day_price: number;
    week_price: number;
    month_price: number;
  }) {
    return await db`
      INSERT OR REPLACE INTO trader_pricing (trader_phone, hour_price, day_price, week_price, month_price)
      VALUES (${phone}, ${pricing.hour_price}, ${pricing.day_price}, ${pricing.week_price}, ${pricing.month_price})
      RETURNING *
    `;
  }

  static async getTraderPricing(phone: string) {
    const [pricing] = await db`
      SELECT * FROM trader_pricing 
      WHERE trader_phone = ${phone}
    `;
    return pricing;
  }

  // Users (MikroTik hotspot users)
  static async createUser(userData: {
    traderPhone: string;
    username: string;
    password?: string;
    profile?: string;
    limitUptime?: string;
    limitBytesIn?: string;
    limitBytesOut?: string;
    limitBytesTotal?: string;
    comment?: string;
    macAddress?: string;
  }) {
    return await db`
      INSERT INTO users (trader_phone, username, password, profile, limit_uptime, 
                        limit_bytes_in, limit_bytes_out, limit_bytes_total, comment, mac_address)
      VALUES (${userData.traderPhone}, ${userData.username}, ${userData.password || null}, 
              ${userData.profile || null}, ${userData.limitUptime || null}, 
              ${userData.limitBytesIn || null}, ${userData.limitBytesOut || null}, 
              ${userData.limitBytesTotal || null}, ${userData.comment || null}, 
              ${userData.macAddress || null})
      RETURNING *
    `;
  }

  static async getUsersByTrader(traderPhone: string) {
    return await db`
      SELECT * FROM users 
      WHERE trader_phone = ${traderPhone}
      ORDER BY created_at DESC
    `;
  }

  static async getAllUsers() {
    return await db`
      SELECT * FROM users 
      ORDER BY created_at DESC
    `;
  }

  static async getUserById(id: string) {
    const [user] = await db`
      SELECT * FROM users 
      WHERE username = ${id}
    `;
    return user;
  }

  static async updateUserStats(id: string, stats: {
    bytes_in?: number;
    bytes_out?: number;
    uptime?: string;
  }) {
    return await db`
      UPDATE users 
      SET bytes_in = ${stats.bytes_in || 0}, 
          bytes_out = ${stats.bytes_out || 0}, 
          uptime = ${stats.uptime || '0s'},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
  }

  static async updateUserMacAddress(username: string, macAddress: string) {
    return await db`
      UPDATE users 
      SET mac_address = ${macAddress}, updated_at = CURRENT_TIMESTAMP
      WHERE username = ${username}
      RETURNING *
    `;
  }

  static async getUserByMacAddress(macAddress: string) {
    const [user] = await db`
      SELECT * FROM users 
      WHERE mac_address = ${macAddress}
    `;
    return user;
  }

  static async updateUser(userData: {
    username: string;
    traderPhone?: string;
    uptime?: string;
    bytesIn?: number;
    bytesOut?: number;
    packetsIn?: number;
    packetsOut?: number;
    limitUptime?: string;
    disabled?: boolean;
    profile?: string;
    macAddress?: string;
  }) {
    // First try to find existing user by username and trader
    const existingUser = await db`
      SELECT username FROM users 
      WHERE username = ${userData.username}
    `;
    if (existingUser.length > 0) {
      // Update existing user
      return await db`
        UPDATE users 
        SET uptime = ${userData.uptime || '0s'},
            bytes_in = ${userData.bytesIn || 0},
            bytes_out = ${userData.bytesOut || 0},
            packets_in = ${userData.packetsIn || 0},
            packets_out = ${userData.packetsOut || 0},
            limit_uptime = ${userData.limitUptime || '0s'},
            disabled = ${userData.disabled || false},
            profile = ${userData.profile || 'default'},
            mac_address = ${userData.macAddress || null},
            updated_at = CURRENT_TIMESTAMP
        WHERE username = ${existingUser[0].username}
        RETURNING *
      `;
    } else {
      // Create new user if doesn't exist
      return await db`
        INSERT INTO users (
          id, username, trader_phone, uptime, bytes_in, bytes_out, 
          packets_in, packets_out, limit_uptime, disabled, profile, mac_address
        )
        VALUES (
          ${userData.username}, ${userData.username}, ${userData.traderPhone}, 
          ${userData.uptime || '0s'}, ${userData.bytesIn || 0}, 
          ${userData.bytesOut || 0}, ${userData.packetsIn || 0}, 
          ${userData.packetsOut || 0}, ${userData.limitUptime || '0s'}, 
          ${userData.disabled || false}, ${userData.profile || 'default'}, 
          ${userData.macAddress || null}
        )
        RETURNING *
      `;
    }
  }

  // Clients
  static async createClient(clientData: {
    phone: string;
    mac_address: string;
    rewarded_user?: boolean;
    trader_phone: string;
  }) {
    return await db`
      INSERT INTO clients (phone, mac_address, rewarded_user, trader_phone)
      VALUES (${clientData.phone}, ${clientData.mac_address}, 
              ${clientData.rewarded_user || false}, ${clientData.trader_phone})
      RETURNING *
    `;
  }

  static async getClientsByTrader(traderPhone: string) {
    return await db`
      SELECT * FROM clients 
      WHERE trader_phone = ${traderPhone}
      ORDER BY created_at DESC
    `;
  }

  static async getAllClients() {
    return await db`
      SELECT * FROM clients 
      ORDER BY created_at DESC
    `;
  }

  // Transactions
  static async createTransaction(transactionData: {
    trader_phone: string;
    type: 'credit_add' | 'voucher_purchase' | 'voucher_used' | 'refund';
    amount: number;
    description: string;
    voucher_id?: string;
  }) {
    return await db`
      INSERT INTO transactions (trader_phone, type, amount, description, voucher_id)
      VALUES (${transactionData.trader_phone}, ${transactionData.type}, 
              ${transactionData.amount}, ${transactionData.description}, 
              ${transactionData.voucher_id || null})
      RETURNING *
    `;
  }

  static async getTransactionsByTrader(traderPhone: string, limit = 50, offset = 0, type?: string) {
    let query = db`
      SELECT * FROM transactions 
      WHERE trader_phone = ${traderPhone}
    `;
    
    if (type) {
      query = db`
        SELECT * FROM transactions 
        WHERE trader_phone = ${traderPhone} AND type = ${type}
      `;
    }
    
    return await db`
      ${query}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  // Vouchers
  static async createVoucher(voucherData: {
    trader_phone: string;
    voucher_code: string;
    duration: string;
    price: number;
    expires_at?: string;
  }) {
    return await db`
      INSERT INTO vouchers (trader_phone, voucher_code, duration, price, expires_at)
      VALUES (${voucherData.trader_phone}, ${voucherData.voucher_code}, 
              ${voucherData.duration}, ${voucherData.price}, ${voucherData.expires_at || null})
      RETURNING *
    `;
  }

  static async getVouchersByTrader(traderPhone: string) {
    return await db`
      SELECT * FROM vouchers 
      WHERE trader_phone = ${traderPhone}
      ORDER BY created_at DESC
    `;
  }

  static async useVoucher(voucherCode: string, usedBy: string) {
    return await db`
      UPDATE vouchers 
      SET is_used = ${true}, used_by = ${usedBy}, used_at = CURRENT_TIMESTAMP
      WHERE voucher_code = ${voucherCode} AND is_used = ${false}
      RETURNING *
    `;
  }

  // Sessions
  static async createSession(sessionData: {
    trader_phone: string;
    user_id?: string;
    session_data?: string;
    start_time?: string;
  }) {
    return await db`
      INSERT INTO sessions (trader_phone, user_id, session_data, start_time)
      VALUES (${sessionData.trader_phone}, ${sessionData.user_id || null}, 
              ${sessionData.session_data || null}, ${sessionData.start_time || null})
      RETURNING *
    `;
  }

  static async getActiveSessions(traderPhone?: string) {
    if (traderPhone) {
      return await db`
        SELECT * FROM active_sessions 
        WHERE trader_phone = ${traderPhone}
      `;
    }
    return await db`SELECT * FROM active_sessions`;
  }

  // Analytics and Reports
  static async getTraderSummary(phone: string) {
    const [summary] = await db`
      SELECT * FROM trader_summary 
      WHERE phone = ${phone}
    `;
    return summary;
  }

  static async getVoucherAnalytics(phone: string) {
    const [analytics] = await db`
      SELECT * FROM voucher_analytics 
      WHERE trader_phone = ${phone}
    `;
    return analytics;
  }

  // Bulk operations
  static async createMultipleUsers(users: Array<{
    trader_phone: string;
    username: string;
    password?: string;
    profile?: string;
    limit_uptime?: string;
    comment?: string;
    mac_address?: string;
  }>) {
    return await db`INSERT INTO users ${db(users)}`;
  }

  static async createMultipleTransactions(transactions: Array<{
    trader_phone: string;
    type: 'credit_add' | 'voucher_purchase' | 'voucher_used' | 'refund';
    amount: number;
    description: string;
    voucher_id?: string;
  }>) {
    return await db`INSERT INTO transactions ${db(transactions)}`;
  }

  // Database maintenance
  static async getDatabaseStats() {
    const [stats] = await db`
      SELECT 
        (SELECT COUNT(*) FROM traders) as trader_count,
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM clients) as client_count,
        (SELECT COUNT(*) FROM transactions) as transaction_count,
        (SELECT COUNT(*) FROM vouchers) as voucher_count,
        (SELECT COUNT(*) FROM sessions WHERE is_active = ${true}) as active_session_count
    `;
    return stats;
  }

  // Advanced Analytics Queries
  static async getRevenueAnalytics(traderPhone: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN type = 'voucher_purchase' THEN amount ELSE 0 END) as revenue,
        SUM(CASE WHEN type = 'credit_add' THEN amount ELSE 0 END) as credit_added,
        SUM(CASE WHEN type = 'credit_deduct' THEN ABS(amount) ELSE 0 END) as credit_deducted
      FROM transactions 
      WHERE trader_phone = ${traderPhone} 
        AND created_at >= ${startDate.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
  }

  static async getTopPerformingTraders(limit: number = 10) {
    return await db`
      SELECT 
        t.phone,
        t.name,
        t.credit,
        t.is_active,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT c.id) as client_count,
        COALESCE(SUM(CASE WHEN tr.type = 'voucher_purchase' THEN tr.amount ELSE 0 END), 0) as total_revenue,
        COUNT(tr.id) as transaction_count
      FROM traders t
      LEFT JOIN users u ON t.phone = u.trader_phone
      LEFT JOIN clients c ON t.phone = c.trader_phone
      LEFT JOIN transactions tr ON t.phone = tr.trader_phone
      GROUP BY t.phone, t.name, t.credit, t.is_active
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `;
  }

  static async getSystemHealthMetrics() {
    return await db`
      SELECT 
        (SELECT COUNT(*) FROM traders WHERE is_active = 1) as active_traders,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM clients) as total_clients,
        (SELECT COUNT(*) FROM transactions WHERE created_at >= datetime('now', '-24 hours')) as transactions_today,
        (SELECT COALESCE(SUM(credit), 0) FROM traders) as total_system_credit,
        (SELECT COUNT(*) FROM message_queue WHERE status = 'pending') as pending_messages,
        (SELECT COUNT(*) FROM message_queue WHERE status = 'failed') as failed_messages
    `;
  }

  static async getTraderPerformanceMetrics(traderPhone: string) {
    return await db`
      SELECT 
        t.phone,
        t.name,
        t.credit,
        t.is_active,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT v.id) as total_vouchers,
        COUNT(DISTINCT CASE WHEN v.is_used = 1 THEN v.id END) as used_vouchers,
        COALESCE(SUM(CASE WHEN tr.type = 'voucher_purchase' THEN tr.amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN tr.type = 'credit_add' THEN tr.amount ELSE 0 END), 0) as total_credit_added,
        COUNT(tr.id) as total_transactions,
        MAX(tr.created_at) as last_transaction_date
      FROM traders t
      LEFT JOIN users u ON t.phone = u.trader_phone
      LEFT JOIN clients c ON t.phone = c.trader_phone
      LEFT JOIN vouchers v ON t.phone = v.trader_phone
      LEFT JOIN transactions tr ON t.phone = tr.trader_phone
      WHERE t.phone = ${traderPhone}
      GROUP BY t.phone, t.name, t.credit, t.is_active
    `;
  }

  static async getDailyRevenueReport(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN type = 'voucher_purchase' THEN amount ELSE 0 END) as daily_revenue,
        COUNT(DISTINCT trader_phone) as active_traders,
        AVG(CASE WHEN type = 'voucher_purchase' THEN amount ELSE NULL END) as avg_transaction_value
      FROM transactions 
      WHERE created_at >= ${startDate.toISOString()}
        AND type = 'voucher_purchase'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
  }

  static async getVoucherUsageAnalytics(traderPhone?: string) {
    const baseQuery = traderPhone 
      ? db`WHERE trader_phone = ${traderPhone}`
      : db`WHERE 1=1`;
    
    return await db`
      SELECT 
        duration,
        COUNT(*) as total_created,
        COUNT(CASE WHEN is_used = 1 THEN 1 END) as used_count,
        COUNT(CASE WHEN is_used = 0 THEN 1 END) as available_count,
        ROUND(COUNT(CASE WHEN is_used = 1 THEN 1 END) * 100.0 / COUNT(*), 2) as usage_percentage
      FROM vouchers 
      ${baseQuery}
      GROUP BY duration
      ORDER BY total_created DESC
    `;
  }

  static async getClientActivityReport(traderPhone: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db`
      SELECT 
        c.phone,
        c.mac_address,
        c.rewarded_user,
        c.created_at as registration_date,
        COUNT(DISTINCT tr.id) as transaction_count,
        COALESCE(SUM(CASE WHEN tr.type = 'voucher_purchase' THEN tr.amount ELSE 0 END), 0) as total_spent,
        MAX(tr.created_at) as last_activity
      FROM clients c
      LEFT JOIN transactions tr ON c.phone = tr.trader_phone 
        AND tr.created_at >= ${startDate.toISOString()}
      WHERE c.trader_phone = ${traderPhone}
      GROUP BY c.phone, c.mac_address, c.rewarded_user, c.created_at
      ORDER BY total_spent DESC
    `;
  }

  // MikroTik Devices
  static async createMikroTik(mikrotikData: {
    name: string;
    host: string;
    username: string;
    password: string;
    port: number;
    description?: string;
    isActive?: boolean;
  }) {
    try {
      const id = `mikrotik_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      
      const result = await db`
        INSERT INTO mikrotiks (id, name, host, username, password, port, description, is_active)
        VALUES (${id}, ${mikrotikData.name}, ${mikrotikData.host}, 
                ${mikrotikData.username}, ${mikrotikData.password}, 
                ${mikrotikData.port}, ${mikrotikData.description || null}, 
                ${mikrotikData.isActive !== false})
        RETURNING *
      `;
      
      return result;
    } catch (error) {
      console.error('❌ DatabaseService.createMikroTik error:', error);
      throw error;
    }
  }

  static async getAllMikroTiks() {
    return await db`
      SELECT * FROM mikrotiks 
      ORDER BY created_at DESC
    `;
  }

  static async getMikroTikById(id: string) {
    const [mikrotik] = await db`
      SELECT * FROM mikrotiks WHERE id = ${id}
    `;
    return mikrotik;
  }

  static async updateMikroTik(id: string, updateData: {
    name?: string;
    host?: string;
    username?: string;
    password?: string;
    port?: number;
    description?: string;
    isActive?: boolean;
  }) {
    const updateFields = [];
    const values = [];
    
    if (updateData.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.host !== undefined) {
      updateFields.push('host = ?');
      values.push(updateData.host);
    }
    if (updateData.username !== undefined) {
      updateFields.push('username = ?');
      values.push(updateData.username);
    }
    if (updateData.password !== undefined) {
      updateFields.push('password = ?');
      values.push(updateData.password);
    }
    if (updateData.port !== undefined) {
      updateFields.push('port = ?');
      values.push(updateData.port);
    }
    if (updateData.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.isActive !== undefined) {
      updateFields.push('is_active = ?');
      values.push(updateData.isActive);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return await db`
      UPDATE mikrotiks 
      SET ${updateFields.join(', ')}
      WHERE id = ${id}
      RETURNING *
    `;
  }

  static async deleteMikroTik(id: string) {
    return await db`
      DELETE FROM mikrotiks WHERE id = ${id}
    `;
  }

  // Discount Management
  static async createDiscount(discountData: {
    trader_phone: string;
    name: string;
    description?: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    category: 'hour' | 'day' | 'week' | 'month';
    start_time: string;
    end_time: string;
  }) {
    const id = `discount_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert times to UTC and format properly
    const startTimeUTC = new Date(discountData.start_time).toISOString().slice(0, 16);
    const endTimeUTC = new Date(discountData.end_time).toISOString().slice(0, 16);
    
    
    return await db`
      INSERT INTO trader_discounts (id, trader_phone, name, description, discount_type, discount_value, category, start_time, end_time)
      VALUES (${id}, ${discountData.trader_phone}, ${discountData.name}, ${discountData.description || null}, 
              ${discountData.discount_type}, ${discountData.discount_value}, ${discountData.category}, 
              ${startTimeUTC}, ${endTimeUTC})
      RETURNING *
    `;
  }

  static async getTraderDiscounts(traderPhone: string) {
    return await db`
      SELECT * FROM trader_discounts 
      WHERE trader_phone = ${traderPhone}
      ORDER BY created_at DESC
    `;
  }

  static async getActiveDiscounts(traderPhone: string, category?: string) {
    const now = new Date();
    // Format time to match database format (without seconds and timezone)
    const nowFormatted = now.toISOString().slice(0, 16); // "2025-10-14T15:48"    
    let query;
    if (category) {
      query = db`
        SELECT * FROM trader_discounts 
        WHERE trader_phone = ${traderPhone} 
          AND is_active = ${true}
          AND category = ${category}
          AND start_time <= ${nowFormatted}
          AND end_time >= ${nowFormatted}
      `;
    } else {
      query = db`
        SELECT * FROM trader_discounts 
        WHERE trader_phone = ${traderPhone} 
          AND is_active = ${true}
          AND start_time <= ${nowFormatted}
          AND end_time >= ${nowFormatted}
      `;
    }
    
    const results = await query;
    return results;
  }

  static async updateDiscount(id: string, updateData: {
    name?: string;
    description?: string;
    discount_type?: 'percentage' | 'fixed_amount';
    discount_value?: number;
    category?: 'hour' | 'day' | 'week' | 'month';
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
  }) {
    // Convert times to UTC if provided
    let startTimeUTC = updateData.start_time;
    let endTimeUTC = updateData.end_time;
    
    if (updateData.start_time) {
      startTimeUTC = new Date(updateData.start_time).toISOString().slice(0, 16);
    }
    if (updateData.end_time) {
      endTimeUTC = new Date(updateData.end_time).toISOString().slice(0, 16);
    }

    return await db`
      UPDATE trader_discounts 
      SET 
        ${updateData.name !== undefined ? db`name = ${updateData.name}` : db``},
        ${updateData.description !== undefined ? db`description = ${updateData.description}` : db``},
        ${updateData.discount_type !== undefined ? db`discount_type = ${updateData.discount_type}` : db``},
        ${updateData.discount_value !== undefined ? db`discount_value = ${updateData.discount_value}` : db``},
        ${updateData.category !== undefined ? db`category = ${updateData.category}` : db``},
        ${startTimeUTC !== undefined ? db`start_time = ${startTimeUTC}` : db``},
        ${endTimeUTC !== undefined ? db`end_time = ${endTimeUTC}` : db``},
        ${updateData.is_active !== undefined ? db`is_active = ${updateData.is_active}` : db``}
      WHERE id = ${id}
      RETURNING *
    `;
  }

  static async deleteDiscount(id: string) {
    return await db`
      DELETE FROM trader_discounts WHERE id = ${id}
    `;
  }

  static async getDiscount(id: string) {
    const [discount] = await db`
      SELECT * FROM trader_discounts WHERE id = ${id}
    `;
    return discount;
  }

  // Message Queue Management
  static async addMessageToQueue(phoneNumber: string, message: string, priority: number = 0) {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return await db`
      INSERT INTO message_queue (id, phone_number, message, priority)
      VALUES (${id}, ${phoneNumber}, ${message}, ${priority})
      RETURNING *
    `;
  }

  // Calculate final price with discounts applied
  static async calculateDiscountedPrice(
    traderPhone: string, 
    category: 'hour' | 'day' | 'week' | 'month', 
    basePrice: number
  ): Promise<{ finalPrice: number; appliedDiscount?: any; originalPrice: number }> {
    try {
      // Get active discounts for this trader and category
      const activeDiscounts = await this.getActiveDiscounts(traderPhone, category);
      if (activeDiscounts.length === 0) {
        return { finalPrice: basePrice, originalPrice: basePrice };
      }
      // Find the best discount (highest percentage or fixed amount)
      let bestDiscount = null;
      let bestSavings = 0;

      for (const discount of activeDiscounts) {
        let savings = 0;
        
        if (discount.discount_type === 'percentage') {
          savings = (basePrice * discount.discount_value) / 100;
        } else if (discount.discount_type === 'fixed_amount') {
          savings = Math.min(discount.discount_value, basePrice); // Can't discount more than the price
        }

        if (savings > bestSavings) {
          bestSavings = savings;
          bestDiscount = discount;
        }
      }

      const finalPrice = Math.max(0, basePrice - bestSavings); // Ensure price doesn't go below 0

      return {
        finalPrice,
        appliedDiscount: bestDiscount,
        originalPrice: basePrice
      };
    } catch (error) {
      console.error('Error calculating discounted price:', error);
      return { finalPrice: basePrice, originalPrice: basePrice };
    }
  }

  // Get transactions for a specific trader
  static async getTraderTransactions(traderPhone: string) {
    return await db`
      SELECT * FROM transactions 
      WHERE trader_phone = ${traderPhone}
      ORDER BY created_at DESC
    `;
  }
}

export default DatabaseService;
