import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { sendWhatsAppMessage } from '@/lib/whatsapp-bot';

// POST /api/credits/add - Add credit to trader
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { traderPhone, amount, description } = body;

    if (!traderPhone || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Trader phone and positive amount are required' },
        { status: 400 }
      );
    }

    // Check if trader exists
    const trader = await DatabaseService.getTrader(traderPhone);
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    // Create transaction record (credit is now calculated dynamically from transactions)
    const transaction = await DatabaseService.createTransaction({
      trader_phone: traderPhone,
      type: 'credit_add',
      amount,
      description: description || `Credit added: $${amount}`
    });

    // Get updated trader with calculated credit
    const updatedTrader = await DatabaseService.getTrader(traderPhone);

    // Send WhatsApp notification to trader
    try {
      // Calculate new credit balance from all transactions
      const allTransactions = await DatabaseService.getTransactionsByTrader(traderPhone);
      let newCreditBalance = 0;
      allTransactions.forEach((t: any) => {
        if (t.type === 'credit_add') {
          newCreditBalance += Math.abs(t.amount || 0);
        } else if (t.type === 'voucher_purchase') {
          newCreditBalance -= Math.abs(t.amount || 0);
        }
      });

      const message = `💰 تم إضافة رصيد جديد لحسابك!\n\nالمبلغ: $${amount}\nالرصيد الجديد: $${newCreditBalance}\n\nشكراً لاستخدامك خدماتنا!`;
      await sendWhatsAppMessage(traderPhone, message);
    } catch (whatsappError) {
      console.warn('⚠️ Failed to send WhatsApp notification:', whatsappError);
      // Don't fail the credit addition if WhatsApp fails
    }

    return NextResponse.json({
      success: true,
      data: {
        trader: updatedTrader,
        transaction
      },
      message: 'Credit added successfully'
    });
  } catch (error) {
    console.error('Error adding credit:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add credit',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
