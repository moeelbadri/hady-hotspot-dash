import { DatabaseService } from './database';
import { getMikroTikClient } from './mikrotik-api';
import { checkAndSendUptimeNotifications, cleanupOldNotifications } from './notification-service';

// Initialize cron jobs for background tasks
export async function initCronJobs() {

    try {

      // Get all active traders
      let traders = await DatabaseService.getAllTraders();
            
      // MikroTik data sync cron job (every 10 seconds)
      setInterval(async () => {
        traders = await DatabaseService.getAllTraders();
      }, 1 * 10 * 1000); // 10 seconds
      console.log("Initializing cron job Completed... at phase phase-production-server");

      for (const trader of traders) {
        if (!trader.is_active) continue;

        try {
          // Get MikroTik client for this trader
          const mikrotikClient = await getMikroTikClient(trader.mikrotik_id);
          
          if (mikrotikClient) {
            // Sync users from MikroTik
            const users = await mikrotikClient.menu("/ip/hotspot/user").get();
            
                      
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
                    uptime: user.uptime || '0s',
                    bytesIn: user['bytes-in'] || user.bytesIn || user.bytes_in || existingUser.bytes_in || 0,
                    bytesOut: user['bytes-out'] || user.bytesOut || user.bytes_out || existingUser.bytes_out || 0,
                    packetsIn: user['packets-in'] || user.packetsIn || user.packets_in || existingUser.packets_in || 0,
                    packetsOut: user['packets-out'] || user.packetsOut || user.packets_out || existingUser.packets_out || 0,
                    disabled: user.disabled || false,
                    limitUptime: user['limit-uptime'] || user.limitUptime || user.limit_uptime || existingUser.limit_uptime,
                    macAddress: user['mac-address'] || user.macAddress || user.mac_address || existingUser.mac_address
                  });
                }
              }
            }

                // Check for uptime notifications after updating user data
                await checkAndSendUptimeNotifications(sessions);
                
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
}