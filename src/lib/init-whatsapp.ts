// Initialize WhatsApp Bot on Next.js startup
import fs from 'fs';
import { whatsappBot } from './whatsapp-bot';
import { db } from './database';

// Check if WhatsApp session exists and get PID if available
let pid: string | null = null;
try {
  const pidWhatsappBot = ".wwebjs_auth/session-hotspot-manager-bot/DevToolsActivePort";
  if (fs.existsSync(pidWhatsappBot)) {
    pid = fs.readFileSync(pidWhatsappBot, 'utf8').split('/')[0];
  }
} catch (error) {
}


export async function initializeWhatsAppBot() {
  try {
    // Clean up any stale WhatsApp bot instances (older than 1 minute in dev, 5 minutes in prod)
    await db`
        UPDATE cron_jobs 
        SET status = 'stopped', last_updated = CURRENT_TIMESTAMP 
        WHERE service = 'whatsapp_bot' 
        AND status = 'running' 
        AND last_updated < datetime('now', '-1 minute')
    `;
    
    // Check if WhatsApp bot is already running in database
    const existingBot = await db`
        SELECT * FROM cron_jobs WHERE service = 'whatsapp_bot' AND status = 'running'
    `;
    
    if (existingBot.length > 0) {
        return;
    }
    
    // Mark WhatsApp bot as running in database
    await db`
        INSERT OR REPLACE INTO cron_jobs (service, status, last_updated, details)
        VALUES ('whatsapp_bot', 'running', CURRENT_TIMESTAMP, 'WhatsApp Bot service')
    `;
    
    await whatsappBot.initialize();
    
    // Check bot status after initialization
    const status = await whatsappBot.getStatus();

    // Wait for bot to be ready before sending test message
    let attempts = 0;
    while (!whatsappBot.isReady && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (whatsappBot.isReady) {
      const client = whatsappBot.client;
      await client.sendMessage('972592790902@c.us', 'Test message from bot');
    } else {
    }
  } catch (error) {
    console.error('❌ Failed to initialize WhatsApp Bot:', error);
    // Mark as stopped in database if initialization failed
    try {
      await db`
          UPDATE cron_jobs 
          SET status = 'stopped', last_updated = CURRENT_TIMESTAMP 
          WHERE service = 'whatsapp_bot'
      `;
    } catch (dbError) {
      console.error('❌ Error updating database status:', dbError);
    }
    // Don't throw error to prevent app crash
  }
}

// Graceful shutdown
export async function shutdownWhatsAppBot() {
  try {
    await whatsappBot.destroy();
    
    // Mark WhatsApp bot as stopped in database
    await db`
        UPDATE cron_jobs 
        SET status = 'stopped', last_updated = CURRENT_TIMESTAMP 
        WHERE service = 'whatsapp_bot'
    `;
    
  } catch (error) {
    console.error('❌ Error shutting down WhatsApp Bot:', error);
  }
}

// Handle process signals
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await shutdownWhatsAppBot();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdownWhatsAppBot();
    process.exit(0);
  });
}
