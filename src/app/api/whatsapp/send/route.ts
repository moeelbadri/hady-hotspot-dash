import { NextRequest, NextResponse } from 'next/server';
import { whatsappBot } from '@/lib/whatsapp-bot';

// Send WhatsApp message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message, type = 'text' } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone and message are required' },
        { status: 400 }
      );
    }

    // Format phone number
    const formatPhone = (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      if (!cleaned.startsWith('970')) {
        return `970${cleaned}`;
      }
      return cleaned;
    };

    const formattedPhone = formatPhone(phone);
    const success = await whatsappBot.sendMessage(formattedPhone, message);

    if (success) {
      return NextResponse.json({
        success: true,
        data: {
          phone: formattedPhone,
          message,
          type
        },
        message: 'Message sent successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Message queued for delivery',
        data: {
          phone: formattedPhone,
          message,
          type
        }
      }, { status: 202 });
    }

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get WhatsApp bot status
export async function GET(request: NextRequest) {
  try {
    const status = whatsappBot.getStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
      message: 'WhatsApp bot status retrieved'
    });

  } catch (error) {
    console.error('Error getting WhatsApp bot status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}