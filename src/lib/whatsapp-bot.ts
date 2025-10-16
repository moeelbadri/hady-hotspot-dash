// WhatsApp Bot Integration for Next.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { getMikroTikClient } from './mikrotik-api';
import { DatabaseService, db } from './database';
import { whatsappPubSub } from './whatsapp-pubsub';
import { generateCredentials, parseMikroTikTime } from '../utils';

// WhatsApp Bot Class
class WhatsAppBot {
  public client: any;
  public isReady: boolean = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "hotspot-manager-bot"
      }),
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          '--no-pings',
          '--disable-background-networking'
        ],
        headless: true,
        timeout: 60000
      },
      restartOnAuthFail: true,
      qrMaxRetries: 3,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // QR Code event
    this.client.on('qr', (qr: string) => {
      qrcode.generate(qr, { small: true });
    });

    // Ready event
    this.client.on('ready', async () => {
      this.isReady = true;
      
      // Update bot status in database
      await whatsappPubSub.updateBotStatus(true);
      
      await this.processMessageQueue();
      
      // Start processing messages from database (check every 1 second)
      whatsappPubSub.startProcessing(1000);
    });

    // Disconnected event
    this.client.on('disconnected', async (reason: string) => {
      this.isReady = false;
      
      // Update bot status in database
      await whatsappPubSub.updateBotStatus(false);
      
      setTimeout(() => {
        this.client.initialize();
      }, 5000);
    });

    // Authentication failure
    this.client.on('auth_failure', (msg: string) => {
      console.error('❌ Authentication failed:', msg);
      this.isReady = false;
    });

    // Message event
    this.client.on('message', async (msg: any) => {
      if (!msg.fromMe) {
        await this.handleIncomingMessage(msg);
      }
    });

    // Error handling
    this.client.on('page_error', (error: any) => {
      console.error('❌ Page error:', error);
      this.isReady = false;
    });
  }

  // Handle incoming messages from traders
  private async handleIncomingMessage(msg: any) {
    try {
      const phoneNumber = msg.from.split('@')[0];
      const message = msg.body.trim();


      // Find trader by phone number using database
      const trader = await DatabaseService.getTrader(phoneNumber);
      const traderClient = message.split(".")?.[1] ? (await DatabaseService.getUserById(message.split(".")[0]))?.trader_phone || "" : ""; // assuming the ID is the username
      const clients = await DatabaseService.getClientsByTrader(traderClient);
      const client = clients.find((c: any) => c.phone === phoneNumber);
      if(trader){
        try{
          const match = message.match(/(\d+|\d[\u0660-\u0669]+)/); 
          const count = match ? parseInt(match[0].replace(/[\u0660-\u0669]/g, (d: string) => d.charCodeAt(0) - 0x0660), 10) : 1;
          let unit = message.replace(match ? match[0] : "", "").trim();
          let unitEnglish = ""
            // لو الرسالة كلها أرقام → اعتبرها ساعات
            if (/^\s*[\d\u0660-\u0669]+\s*$/.test(message)) {
              unit = "ساعة";
              unitEnglish = "hour";
            }
          let duration;
          if(unit == "ساعة"|| unit == "ساعات") {duration =  3600 * count; unitEnglish = "hour"};
          if(unit == "يوم"|| unit == "ايام" || unit == "يوما" || unit == "أيام" ) {duration =  24 * 3600 * count; unitEnglish = "day"}  ;
          if(unit == "اسبوع"|| unit == "اسابيع" || unit == "أسابيع" || unit == "اسبوعا" || unit == "أسبوعا") {duration = 7 * 24 * 3600 * count; unitEnglish = "week"};
          if(unit == "شهر" || unit == "اشهر" || unit == "شهرا" || unit == "أشهر") {duration =  30 * 24 * 3600 * count; unitEnglish = "month"};

            if(!duration) throw new Error("invalid code format");
            // Get trader pricing from database
            const traderPricing = await DatabaseService.getTraderPricing(trader.phone);
            if (!traderPricing) throw new Error("trader pricing not found");
            
            // Get base price and calculate discounted price
            const basePrice = (traderPricing as any)[`${unitEnglish}_price`];
            const priceCalculation = await DatabaseService.calculateDiscountedPrice(
              trader.phone, 
              unitEnglish as 'hour' | 'day' | 'week' | 'month', 
              basePrice
            );
            
            const voucherPrice = priceCalculation.finalPrice * count || 0;

            // Calculate current credit from transactions
            const transactions = await DatabaseService.getTransactionsByTrader(trader.phone);
            let currentCredit = 0;
            transactions.forEach((transaction: any) => {
              if (transaction.type === 'credit_add') {
                currentCredit += Math.abs(transaction.amount || 0);
              } else if (transaction.type === 'voucher_purchase') {
                currentCredit -= Math.abs(transaction.amount || 0);
              }
            });

            // Check if trader has enough credit
            if(currentCredit < voucherPrice) throw new Error("insufficient credit");
            
            const mikrotikUsers = await DatabaseService.getUsersByTrader(trader.phone);


            let credentials = generateCredentials();

            while (mikrotikUsers.some((user: any) => user.username === credentials.username)) {
              credentials = generateCredentials();
            }

          let mikrotikClient = null;
            // now add to mikrotik
            const mikrotikDeviceId = trader.mikrotik_id || trader.mikrotik_host;
            if (!mikrotikDeviceId) {
              throw new Error('trader mikrotik not found');
            }
            mikrotikClient = await getMikroTikClient(mikrotikDeviceId).catch((error) => {
              console.error('❌ Error getting mikrotik client:', error);
              throw new Error('Failed to get mikrotik client');
            });

            await mikrotikClient.menu('/ip hotspot user').add({
              name: credentials.username,
              password: "",
              profile: "default",
              limitUptime: duration,
              server: trader.phone,
              comment: trader.phone,
            }).catch((error) => {
              console.error('❌ Error adding mikrotik user:', error);
              if(error instanceof Error && error.message == "input does not match any value of server") throw new Error('trader mikrotik not found');
              throw new Error('Failed to add mikrotik user');
            });

             
            // Create MikroTik user in database
            const mikrotikUser = await DatabaseService.createUser({
              traderPhone: trader.phone,
              username: credentials.username,
              password: "",
              profile: "",
              limitUptime: duration.toString(),
              limitBytesIn: "",
              limitBytesOut: "",
              limitBytesTotal: "",
              comment: "Voucher"
            });

  
            // Create transaction in database
            await DatabaseService.createTransaction({
              trader_phone: trader.phone,
              type: "voucher_purchase",
              amount: voucherPrice * -1,
              description: `Voucher created: ${count} ${unitEnglish}${count > 1 ? 's' : ''} - $${voucherPrice} - whatsapp`
            });

            // Credit is now calculated dynamically from transactions, no need to update
            
            // Format duration to human-readable format
            const formatDuration = (seconds: number): string => {
              if (seconds === 3600) return '1 ساعة';
              if (seconds === 86400) return '1 يوم';
              if (seconds === 604800) return '1 أسبوع';
              if (seconds === 2592000) return '1 شهر';
              
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
            };
            
            // Calculate new credit balance after transaction
            const newCreditBalance = currentCredit - voucherPrice;
            
            const response: string = 
            `تم خصم من رصيدك: ${voucherPrice} $

            ✅ هذا هو  
            🔑 الكود: ${credentials.username}  
            ⏳ المدة: ${formatDuration(duration)}  

            الرصيد الحالي: ${newCreditBalance}$  
            شكراً لك .`
            // send message to trader
            this.sendMessage(phoneNumber, response);
        } catch (error) {
          console.error('❌ Error handling message:', error);
          if(error instanceof Error && error.message == "insufficient credit") await this.sendMessage(phoneNumber, 'عذراً، حسابك حالياً خالي من الرصيد. يرجى شحن رصيدك أولاً لإتمام العملية.');
          if(error instanceof Error && error.message == "trader mikrotik not found") await this.sendMessage(phoneNumber, 'لا يوجد حساب ميكروتيك لهذا الرقم. يرجى التواصل مع المسؤول .');
          if(error instanceof Error && error.message == "invalid code format") {
            const traderPricing = await DatabaseService.getTraderPricing(trader.phone);
            await this.sendMessage(phoneNumber, 
            `⚠️ صيغة غير صحيحة.
            من فضلك اكتب المدة بشكل صحيح،
            ساعة / 1 ساعة |${traderPricing?.hour_price || 0}$ لكل ساعة

            يوم / 2 يوم |${traderPricing?.day_price || 0}$ لكل يوم

            اسبوع / 3 اسبوع |${traderPricing?.week_price || 0}$ لكل اسبوع

            شهر / 4 شهر |${traderPricing?.month_price || 0}$ لكل شهر
            `);
          }
         
          await this.sendMessage(phoneNumber, '❌ حدث خطأ ما. يرجى التواصل مع المسؤول.');
        }
      }else{
        if(client){
          const parts = message.split(".");
          const mikrotikUsers = await DatabaseService.getUsersByTrader(traderClient);
          const user = mikrotikUsers.find((u: any) => u.username === parts[0]);
          if(user && parts.length === 2) return await this.sendMessage(phoneNumber, '❌ لقد حصلت بالفعل على 30 دقيقة إضافية');
        }else{
          const parts = message.split(".");
          if (parts.length === 2) {
            const [username, macAddress] = parts;
            const mikrotikUserDB = await DatabaseService.getUserById(username); // assuming the ID is the username

            if(!mikrotikUserDB) return await this.sendMessage(phoneNumber, '❌ لم يتم العثور على المستخدم');
            const mikrotik = await DatabaseService.getTrader(mikrotikUserDB.trader_phone);
            if(!mikrotik) return await this.sendMessage(phoneNumber, '❌ لم يتم العثور على المستخدم');
            const mikrotikClient = await getMikroTikClient(mikrotik.mikrotik_host);

            const mikrotikUser = await mikrotikClient.menu('/ip hotspot user').where({name: username}).get();

            // Parse current limit_uptime to seconds and add 1800 seconds (30 minutes)
            const currentUptimeSeconds = parseMikroTikTime(mikrotikUser?.[0]?.limitUptime);
            const newUptimeSeconds = currentUptimeSeconds + 1800;

            await mikrotikClient.menu('/ip hotspot user').where({name: username}).update({
              limitUptime: newUptimeSeconds.toString()
            });
            
            await DatabaseService.updateUserStats(mikrotikUserDB.id, {
              uptime: newUptimeSeconds.toString()
            });
            
            await DatabaseService.createClient({
              phone: phoneNumber,
              mac_address: macAddress,
              rewarded_user: true,
              trader_phone: mikrotikUserDB.trader_phone,
            });
            
            return await this.sendMessage(phoneNumber, '✅ لقد حصلت على 30 دقيقة إضافية');      
          }          
        }
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      await msg.reply('❌ An error occurred while processing your request.');
    }
  }

  // Send message to client
  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Add message to database queue
      const messageId = await whatsappPubSub.addMessage(phoneNumber, message);
      
      if (!this.isReady || !this.client) {
        return false;
      }

      // Process the message immediately if bot is ready
      await this.processQueuedMessage(messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  }

  // Process a specific queued message
  private async processQueuedMessage(messageId: string): Promise<void> {
    try {
      const [message] = await db`
        SELECT * FROM message_queue WHERE id = ${messageId} AND status = 'pending'
      `;
      
      if (!message) return;

      await whatsappPubSub.markAsProcessing(messageId);
      
      const formattedPhone = message.phone_number.includes('@c.us') 
        ? message.phone_number 
        : `${message.phone_number}@c.us`;
      
      await this.client.sendMessage(formattedPhone, message.message);
      
      await whatsappPubSub.markAsSent(messageId);
    } catch (error) {
      console.error('❌ Error processing queued message:', error);
      await whatsappPubSub.markAsFailed(messageId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Process queued messages from database
  private async processMessageQueue() {
    try {
      const pendingMessages = await whatsappPubSub.getPendingMessages(10);
      
      if (pendingMessages.length === 0) {
        return;
      }

      
      for (const message of pendingMessages) {
        try {
          await this.processQueuedMessage(message.id);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        } catch (error) {
          console.error('❌ Error processing queued message:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error processing message queue:', error);
    }
  }

  // Initialize the bot
  async initialize(): Promise<void> {
    try {
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Error initializing WhatsApp bot:', error);
      throw error;
    }
  }

  // Get bot status
  async getStatus(): Promise<{ isReady: boolean; queueLength: number }> {
    const pendingMessages = await whatsappPubSub.getPendingMessages(100);
    return {
      isReady: this.isReady,
      queueLength: pendingMessages.length
    };
  }

  // Force set ready status (for cases where bot is working but flag isn't set)
  forceReady(): void {
    this.isReady = true;
    this.processMessageQueue();
  }

  // Destroy the bot
  async destroy(): Promise<void> {
    try {
      await this.client.destroy();
    } catch (error) {
      // console.error('❌ Error destroying WhatsApp bot:', error);
    }
  }
}

// Export sendMessage function for use in API routes
export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  
  try {
    // Add message to database queue
    await whatsappPubSub.addMessage(phoneNumber, message);
    return true;
  } catch (error) {
    console.error('❌ Failed to add message to queue:', error);
    return false;
  }
}

// Export singleton instance
export const whatsappBot = new WhatsAppBot();

