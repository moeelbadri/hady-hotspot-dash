import { db } from './database';

// Pub/Sub Service for WhatsApp Bot using SQLite
export class WhatsAppPubSub {
  private static instance: WhatsAppPubSub;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeBotStatus();
  }

  static getInstance(): WhatsAppPubSub {
    if (!WhatsAppPubSub.instance) {
      WhatsAppPubSub.instance = new WhatsAppPubSub();
    }
    return WhatsAppPubSub.instance;
  }

  // Initialize bot status in database
  private async initializeBotStatus() {
    try {
      const [existing] = await db`
        SELECT * FROM bot_status WHERE id = 1
      `;
      
      if (!existing) {
        await db`
          INSERT INTO bot_status (is_ready, last_heartbeat, message_count, error_count)
          VALUES (${false}, CURRENT_TIMESTAMP, ${0}, ${0})
        `;
      }
    } catch (error) {
      console.error('❌ Failed to initialize bot status:', error);
    }
  }

  // Add message to queue
  async addMessage(
    phoneNumber: string, 
    message: string, 
    options: {
      priority?: number;
      scheduledAt?: Date;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await db`
        INSERT INTO message_queue (
          id, phone_number, message, status, priority, 
          max_retries, scheduled_at
        ) VALUES (
          ${messageId}, ${phoneNumber}, ${message}, ${'pending'}, 
          ${options.priority || 0}, ${options.maxRetries || 3}, 
          ${options.scheduledAt ? options.scheduledAt.toISOString() : new Date().toISOString()}
        )
      `;
      
      return messageId;
    } catch (error) {
      console.error('❌ Failed to add message to queue:', error);
      throw error;
    }
  }

  // Get pending messages (ordered by priority and creation time)
  async getPendingMessages(limit = 10): Promise<Array<{
    id: string;
    phone_number: string;
    message: string;
    priority: number;
    retry_count: number;
    max_retries: number;
    created_at: string;
    scheduled_at: string;
  }>> {
    try {
      return await db`
        SELECT id, phone_number, message, priority, retry_count, max_retries, created_at, scheduled_at
        FROM message_queue 
        WHERE status = 'pending' 
          AND datetime(scheduled_at) <= datetime('now')
        ORDER BY priority DESC, created_at ASC
        LIMIT ${limit}
      `;
    } catch (error) {
      console.error('❌ Failed to get pending messages:', error);
      return [];
    }
  }

  // Mark message as processing
  async markAsProcessing(messageId: string): Promise<void> {
    try {
      await db`
        UPDATE message_queue 
        SET status = 'processing'
        WHERE id = ${messageId}
      `;
    } catch (error) {
      console.error('❌ Failed to mark message as processing:', error);
    }
  }

  // Mark message as sent
  async markAsSent(messageId: string): Promise<void> {
    try {
      await db`
        UPDATE message_queue 
        SET status = 'sent', processed_at = CURRENT_TIMESTAMP
        WHERE id = ${messageId}
      `;
      
      // Update bot stats
      await this.incrementMessageCount();
    } catch (error) {
      console.error('❌ Failed to mark message as sent:', error);
    }
  }

  // Mark message as failed
  async markAsFailed(messageId: string, errorMessage: string): Promise<void> {
    try {
      const [message] = await db`
        SELECT retry_count, max_retries FROM message_queue WHERE id = ${messageId}
      `;
      
      if (message && message.retry_count < message.max_retries) {
        // Retry the message
        await db`
          UPDATE message_queue 
          SET status = 'pending', 
              retry_count = retry_count + 1,
              error_message = ${errorMessage},
              scheduled_at = datetime('now', '+5 minutes')
          WHERE id = ${messageId}
        `;
      } else {
        // Mark as permanently failed
        await db`
          UPDATE message_queue 
          SET status = 'failed', 
              processed_at = CURRENT_TIMESTAMP,
              error_message = ${errorMessage}
          WHERE id = ${messageId}
        `;
        await this.incrementErrorCount();
      }
    } catch (error) {
      console.error('❌ Failed to mark message as failed:', error);
    }
  }

  // Update bot status
  async updateBotStatus(isReady: boolean): Promise<void> {
    try {
      await db`
        UPDATE bot_status 
        SET is_ready = ${isReady}, 
            last_heartbeat = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `;
    } catch (error) {
      console.error('❌ Failed to update bot status:', error);
    }
  }

  // Get bot status
  async getBotStatus(): Promise<{
    is_ready: boolean;
    last_heartbeat: string;
    message_count: number;
    error_count: number;
    pending_messages: number;
  }> {
    try {
      const [status] = await db`
        SELECT is_ready, last_heartbeat, message_count, error_count
        FROM bot_status WHERE id = 1
      `;
      
      const [pendingCount] = await db`
        SELECT COUNT(*) as count FROM message_queue WHERE status = 'pending'
      `;
      
      return {
        is_ready: status?.is_ready || false,
        last_heartbeat: status?.last_heartbeat || new Date().toISOString(),
        message_count: status?.message_count || 0,
        error_count: status?.error_count || 0,
        pending_messages: pendingCount?.count || 0
      };
    } catch (error) {
      console.error('❌ Failed to get bot status:', error);
      return {
        is_ready: false,
        last_heartbeat: new Date().toISOString(),
        message_count: 0,
        error_count: 0,
        pending_messages: 0
      };
    }
  }

  // Increment message count
  private async incrementMessageCount(): Promise<void> {
    try {
      await db`
        UPDATE bot_status 
        SET message_count = message_count + 1
        WHERE id = 1
      `;
    } catch (error) {
      console.error('❌ Failed to increment message count:', error);
    }
  }

  // Increment error count
  private async incrementErrorCount(): Promise<void> {
    try {
      await db`
        UPDATE bot_status 
        SET error_count = error_count + 1
        WHERE id = 1
      `;
    } catch (error) {
      console.error('❌ Failed to increment error count:', error);
    }
  }

  // Start processing messages
  startProcessing(intervalMs = 1000): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    this.processingInterval = setInterval(async () => {
      await this.processMessages();
    }, intervalMs);
  }

  // Stop processing messages
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
  }

  // Process messages (to be called by WhatsApp bot)
  async processMessages(): Promise<void> {
    try {
      const pendingMessages = await this.getPendingMessages(5);
      
      if (pendingMessages.length === 0) {
        return;
      }

      
      for (const message of pendingMessages) {
        await this.markAsProcessing(message.id);
        
        // Import and use the WhatsApp bot to actually send the message
        const { whatsappBot } = await import('./whatsapp-bot');
        
        if (whatsappBot.isReady) {
          try {
            // Get the message details
            const [messageData] = await db`
              SELECT * FROM message_queue WHERE id = ${message.id}
            `;
            
            if (messageData) {
              const formattedPhone = messageData.phone_number.includes('@c.us') 
                ? messageData.phone_number 
                : `${messageData.phone_number}@c.us`;
              
              // Send the message using WhatsApp bot
              await whatsappBot.client.sendMessage(formattedPhone, messageData.message);
              
              // Mark as sent
              await this.markAsSent(message.id);
            }
          } catch (error) {
            console.error('❌ Error sending message:', error);
            await this.markAsFailed(message.id, error instanceof Error ? error.message : 'Unknown error');
          }
        } else {
          // Reset to pending so it can be retried
          await db`
            UPDATE message_queue 
            SET status = 'pending'
            WHERE id = ${message.id}
          `;
        }
      }
    } catch (error) {
      console.error('❌ Error processing messages:', error);
    }
  }

  // Get message statistics
  async getMessageStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    processing: number;
  }> {
    try {
      const [stats] = await db`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing
        FROM message_queue
      `;
      
      return {
        total: stats?.total || 0,
        pending: stats?.pending || 0,
        sent: stats?.sent || 0,
        failed: stats?.failed || 0,
        processing: stats?.processing || 0
      };
    } catch (error) {
      console.error('❌ Failed to get message stats:', error);
      return { total: 0, pending: 0, sent: 0, failed: 0, processing: 0 };
    }
  }

  // Clean up old messages (older than 7 days)
  async cleanupOldMessages(): Promise<void> {
    try {
      const result = await db`
        DELETE FROM message_queue 
        WHERE created_at < datetime('now', '-7 days')
          AND status IN ('sent', 'failed')
      `;
      
    } catch (error) {
      console.error('❌ Failed to cleanup old messages:', error);
    }
  }

  // Get failed messages for retry
  async getFailedMessages(): Promise<Array<{
    id: string;
    phone_number: string;
    message: string;
    error_message: string;
    retry_count: number;
  }>> {
    try {
      return await db`
        SELECT id, phone_number, message, error_message, retry_count
        FROM message_queue 
        WHERE status = 'failed' 
          AND retry_count < max_retries
        ORDER BY created_at ASC
      `;
    } catch (error) {
      console.error('❌ Failed to get failed messages:', error);
      return [];
    }
  }

  // Retry failed message
  async retryMessage(messageId: string): Promise<void> {
    try {
      await db`
        UPDATE message_queue 
        SET status = 'pending',
            retry_count = retry_count + 1,
            scheduled_at = CURRENT_TIMESTAMP,
            error_message = NULL
        WHERE id = ${messageId}
      `;
      
    } catch (error) {
      console.error('❌ Failed to retry message:', error);
    }
  }
}

// Export singleton instance
export const whatsappPubSub = WhatsAppPubSub.getInstance();
