import { NextRequest, NextResponse } from 'next/server';
import { multiMikroTikAPI } from '@/lib/multi-mikrotik-api';

// WhatsApp Webhook for receiving messages from traders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, message } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone number and message are required' },
        { status: 400 }
      );
    }


    // Find trader by phone number
    const trader = multiMikroTikAPI.getTraderByPhone(phoneNumber);
    
    if (!trader) {
      return NextResponse.json({
        success: false,
        error: 'Trader not found',
        message: 'This phone number is not registered as a trader'
      }, { status: 404 });
    }

    // Process different types of messages
    const messageLower = message.toLowerCase().trim();
    
    if (messageLower.startsWith('/users') || messageLower.startsWith('users')) {
      // Get trader's users
      try {
        const users = await multiMikroTikAPI.getTraderUsers(trader.id);
        const userList = users.map(user => 
          `👤 ${user.name} (${user.profile}) - ${user.disabled ? '❌ Disabled' : '✅ Active'}`
        ).join('\n');
        
        const response = `📊 Your Users (${users.length}):\n\n${userList || 'No users found'}`;
        
        return NextResponse.json({
          success: true,
          data: { response },
          message: 'Users list generated'
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get users',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }
    
    else if (messageLower.startsWith('/sessions') || messageLower.startsWith('sessions')) {
      // Get trader's active sessions
      try {
        const sessions = await multiMikroTikAPI.getTraderSessions(trader.id);
        const sessionList = sessions.map(session => 
          `🔗 ${session.user} - ${session.address} (${session.uptime})`
        ).join('\n');
        
        const response = `📡 Active Sessions (${sessions.length}):\n\n${sessionList || 'No active sessions'}`;
        
        return NextResponse.json({
          success: true,
          data: { response },
          message: 'Sessions list generated'
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get sessions',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }
    
    else if (messageLower.startsWith('/status') || messageLower.startsWith('status')) {
      // Get trader status
      try {
        const [users, sessions] = await Promise.all([
          multiMikroTikAPI.getTraderUsers(trader.id),
          multiMikroTikAPI.getTraderSessions(trader.id)
        ]);
        
        const totalDataUsed = sessions.reduce((sum, session) => 
          sum + parseInt(session.bytesIn) + parseInt(session.bytesOut), 0
        );
        
        const response = `📊 Trader Status:\n\n` +
          `👤 Total Users: ${users.length}\n` +
          `🔗 Active Sessions: ${sessions.length}\n` +
          `📈 Data Used: ${(totalDataUsed / 1024 / 1024).toFixed(2)} MB\n` +
          `🌐 Router: ${trader.routerId}\n` +
          `📱 Status: ${trader.status}`;
        
        return NextResponse.json({
          success: true,
          data: { response },
          message: 'Status generated'
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get status',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }
    
    else if (messageLower.startsWith('/help') || messageLower.startsWith('help')) {
      // Show help
      const response = `🤖 Trader Bot Commands:\n\n` +
        `/users - Show all your users\n` +
        `/sessions - Show active sessions\n` +
        `/status - Show your status\n` +
        `/help - Show this help\n\n` +
        `💡 Send any command to get started!`;
      
      return NextResponse.json({
        success: true,
        data: { response },
        message: 'Help generated'
      });
    }
    
    else {
      // Unknown command
      const response = `❓ Unknown command: "${message}"\n\n` +
        `Type /help to see available commands.`;
      
      return NextResponse.json({
        success: true,
        data: { response },
        message: 'Unknown command response'
      });
    }

  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}