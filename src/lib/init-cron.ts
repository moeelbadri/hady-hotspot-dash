import { DatabaseService } from './database';
import { getMikroTikClient } from './mikrotik-api';
import { db } from './database';
import { checkAndSendUptimeNotifications, cleanupOldNotifications } from './notification-service';

// Initialize cron jobs for background tasks
export async function initCronJobs() {

  // MikroTik data sync cron job (every 2 minutes)
  setInterval(async () => {
    try {
      
      // Get all active traders
      const traders = await DatabaseService.getAllTraders();
      
      for (const trader of traders) {
        if (!trader.is_active) continue;
        
        try {
          // Get MikroTik client for this trader
          const mikrotikClient = await getMikroTikClient(trader.mikrotik_id);
          
          if (mikrotikClient) {
            // Sync users from MikroTik
            const users = await mikrotikClient.menu("/ip/hotspot/user").get();
            
            if (users && users.length > 0) {
              for (const user of users) {
                // Check if user exists in database
                const existingUser = await DatabaseService.getUserById(user.name);
                
                if (!existingUser) {
                  // Create new user
                  await DatabaseService.createUser({
                    traderPhone: trader.phone,
                      username: user.name,
                    password: user.password || null,
                      profile: user.profile || 'default',
                      macAddress: user['mac-address'] || user.macAddress || null
                    });
                } else {
                  // Update existing user
                  await DatabaseService.updateUser({
                    username: user.name,
                    traderPhone: trader.phone,
                    profile: user.profile || existingUser.profile,
                    macAddress: user['mac-address'] || user.macAddress || existingUser.mac_address
                  });
                }
              }
            }
            
            // Sync active sessions - simplified approach
            const sessions = await mikrotikClient.menu("/ip/hotspot/active").get();
            
            if (sessions && sessions.length > 0) {
              for (const session of sessions) {
                // Create session record
                await DatabaseService.createSession({
                  trader_phone: trader.phone,
                  user_id: session.user,
                  session_data: JSON.stringify(session),
                  start_time: new Date().toISOString()
                });
              }
            }
            
            // Update user statistics
            const userStats = await mikrotikClient.menu("/ip/hotspot/user").get();
            if (userStats && userStats.length > 0) {
              for (const user of userStats) {
                const existingUser = await DatabaseService.getUserById(user.name);
                if (existingUser) {
                  await DatabaseService.updateUser({
                    username: user.name,
                    traderPhone: trader.phone,
                    uptime: user.uptime || '0s',
                    bytesIn: user['bytes-in'] || user.bytesIn || 0,
                    bytesOut: user['bytes-out'] || user.bytesOut || 0,
                    packetsIn: user['packets-in'] || user.packetsIn || 0,
                    packetsOut: user['packets-out'] || user.packetsOut || 0,
                    disabled: user.disabled || false
                  });
                }
              }
            }
            
            // Get active users for notifications
                const ActiveUsers = await mikrotikClient.menu("/ip/hotspot/active").get();
                // Check for uptime notifications after updating user data
                await checkAndSendUptimeNotifications(ActiveUsers);
                
                // Clean up old notifications (run less frequently)
                if (Math.random() < 0.1) { // 10% chance to run cleanup
                  await cleanupOldNotifications();
                }
            }
      } catch (error) {
          console.error(`❌ Error syncing trader ${trader.phone}:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in MikroTik sync cron job:', error);
    }
  }, 2 * 60 * 1000); // 2 minutes

  // WhatsApp message queue processing (simplified - just log)
  setInterval(async () => {
    try {
      // Note: Full message queue processing would require additional database methods
    } catch (error) {
      console.error('❌ Error in WhatsApp message queue processing:', error);
    }
  }, 30 * 1000); // 30 seconds

  // Database cleanup cron job (simplified)
  setInterval(async () => {
    try {
      // Note: Full cleanup would require additional database methods
    } catch (error) {
      console.error('❌ Error in database cleanup cron job:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

}