import { NextRequest, NextResponse } from 'next/server';
import { whatsappPubSub } from '@/lib/whatsapp-pubsub';
import { sendWhatsAppMessage } from '@/lib/whatsapp-bot';

// GET /api/whatsapp/queue - Get queue status and stats
export async function GET(request: NextRequest) {
  try {
    const botStatus = await whatsappPubSub.getBotStatus();
    const messageStats = await whatsappPubSub.getMessageStats();
    
    return NextResponse.json({
      success: true,
      data: {
        bot: botStatus,
        messages: messageStats
      }
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get queue status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/whatsapp/queue - Add message to queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, message, priority = 0, scheduledAt } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Add message to queue
    const messageId = await whatsappPubSub.addMessage(phoneNumber, message, {
      priority,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
    });

    return NextResponse.json({
      success: true,
      data: { messageId },
      message: 'Message added to queue successfully'
    });
  } catch (error) {
    console.error('Error adding message to queue:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add message to queue',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/whatsapp/queue - Update queue processing
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, messageId } = body;

    switch (action) {
      case 'retry':
        if (!messageId) {
          return NextResponse.json(
            { success: false, error: 'Message ID is required for retry' },
            { status: 400 }
          );
        }
        await whatsappPubSub.retryMessage(messageId);
        return NextResponse.json({
          success: true,
          message: 'Message scheduled for retry'
        });

      case 'cleanup':
        await whatsappPubSub.cleanupOldMessages();
        return NextResponse.json({
          success: true,
          message: 'Old messages cleaned up'
        });

      case 'start_processing':
        whatsappPubSub.startProcessing();
        return NextResponse.json({
          success: true,
          message: 'Message processing started'
        });

      case 'stop_processing':
        whatsappPubSub.stopProcessing();
        return NextResponse.json({
          success: true,
          message: 'Message processing stopped'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating queue:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update queue',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/whatsapp/queue - Get failed messages
export async function DELETE(request: NextRequest) {
  try {
    const failedMessages = await whatsappPubSub.getFailedMessages();
    
    return NextResponse.json({
      success: true,
      data: failedMessages,
      message: 'Failed messages retrieved'
    });
  } catch (error) {
    console.error('Error getting failed messages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get failed messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
