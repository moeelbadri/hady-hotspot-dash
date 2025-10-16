import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/traders/[phone]/transactions - Get transactions for a specific trader
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    
    // Get transactions for the trader
    const transactions = await DatabaseService.getTraderTransactions(phone);
    
    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions,
        count: transactions.length
      }
    });

  } catch (error) {
    console.error('Error fetching trader transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}