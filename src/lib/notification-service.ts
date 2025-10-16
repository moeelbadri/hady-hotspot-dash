import { DatabaseService, db } from './database';
import { sendWhatsAppMessage } from './whatsapp-bot';
import { parseMikroTikTime } from '@/utils';

// Format seconds to human-readable format (Arabic)
function formatDuration(seconds: number): string {
  if (seconds === 0) return '0 دقيقة';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0 && minutes > 0) {
    return `${hours} ساعة و ${minutes} دقيقة`;
  } else if (hours > 0) {
    return `${hours} ساعة`;
  } else if (minutes > 0) {
    return `${minutes} دقيقة`;
  } else {
    return `${seconds} ثانية`;
  }
}

// Check if notification was already sent for this user
async function wasNotificationSent(clientPhone: string, username: string, notificationType: string): Promise<boolean> {
  try {
    const [notification] = await db`
      SELECT id FROM notification_log 
      WHERE client_phone = ${clientPhone} 
      AND user_username = ${username} 
      AND notification_type = ${notificationType}
    `;
    return !!notification;
  } catch (error) {
    console.error('Error checking notification log:', error);
    return false;
  }
}

// Log notification as sent
async function logNotificationSent(clientPhone: string, username: string, notificationType: string): Promise<void> {
  try {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db`
      INSERT OR IGNORE INTO notification_log (id, client_phone, user_username, notification_type, sent_at)
      VALUES (${notificationId}, ${clientPhone}, ${username}, ${notificationType}, CURRENT_TIMESTAMP)
    `;
  } catch (error) {
    console.error('Error logging notification:', error);
  }
}

// Main function to check and send uptime notifications
export async function checkAndSendUptimeNotifications(ActiveUsers: any[]): Promise<void> {
  try {
    
    // Get all clients
    const clients = await DatabaseService.getAllClients();
    if (!clients || clients.length === 0) {
      return;
    }

    // Get all active MikroTik users with their current uptime
    const allUsers = await DatabaseService.getAllUsers();
    
    // combine all users with active sessions on uptime field
    allUsers.forEach((user: any) => {
      const activeUser = ActiveUsers?.find((activeUser: any) => activeUser.user === user.username);
      if (activeUser) {
        // Convert uptime to seconds using the utility function
        user.uptime = parseMikroTikTime(activeUser.uptime || '0s') + parseMikroTikTime(user.uptime || '0s');
      }
    });

    let notificationsSent = 0;

    // Check each client
    for (const client of clients) {
      try {
        // Find MikroTik user by MAC address
        const mikrotikUser = allUsers.find((user: any) => 
          user.mac_address && 
          user.mac_address.toLowerCase() === client.mac_address.toLowerCase()
        );


        if (!mikrotikUser) {
          continue; // No matching MikroTik user found
        }

        // Parse time limits and current uptime
        const limitUptimeSeconds = parseMikroTikTime(mikrotikUser.limit_uptime || '0');
        const currentUptimeSeconds = parseMikroTikTime(mikrotikUser.uptime || '0');

        // Skip if no time limit set
        if (limitUptimeSeconds === 0) {
          continue;
        }

        // Calculate remaining time
        const remainingSeconds = limitUptimeSeconds - currentUptimeSeconds;
        const remainingMinutes = Math.floor(remainingSeconds / 60);

        // Check if user is within 10 minutes of limit
        if (remainingMinutes <= 10 && remainingMinutes > 0) {
          // Check if we already sent notification for this user
          const alreadySent = await wasNotificationSent(
            client.phone, 
            mikrotikUser.username, 
            'uptime_warning'
          );

          if (!alreadySent) {
            // Send notification
            const message = `⚠️ تنبيه: انتهاء الإنترنت قريباً!

🔑 الكود: ${mikrotikUser.username}
⏰ الوقت المتبقي: ${formatDuration(remainingSeconds)}

شكراً لاستخدامك خدماتنا!`;

            const sent = await sendWhatsAppMessage(client.phone, message);
            
            if (sent) {
              // Log the notification
              await logNotificationSent(
                client.phone, 
                mikrotikUser.username, 
                'uptime_warning'
              );
              
              notificationsSent++;
            } else {
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing client ${client.phone}:`, error);
      }
    }

    if (notificationsSent > 0) {
    } else {
    }

  } catch (error) {
    console.error('❌ Error in uptime notification check:', error);
  }
}

// Clean up old notifications (older than 24 hours)
export async function cleanupOldNotifications(): Promise<void> {
  try {
    const result = await db`
      DELETE FROM notification_log 
      WHERE sent_at < datetime('now', '-24 hours')
    `;
  } catch (error) {
    console.error('❌ Error cleaning up old notifications:', error);
  }
}
