import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/traders/[phone] - Get trader by phone
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const trader = await DatabaseService.getTrader(phone);
    
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    // Get trader's users, sessions, and transactions
    const [users, sessions, transactions] = await Promise.all([
      DatabaseService.getUsersByTrader(trader.phone),
      DatabaseService.getActiveSessions(trader.phone),
      DatabaseService.getTransactionsByTrader(trader.phone)
    ]);

    // Calculate credit balance from transactions
    let calculatedCredit = 0;
    transactions.forEach((transaction: any) => {
      if (transaction.type === 'credit_add') {
        calculatedCredit += Math.abs(transaction.amount || 0);
      } else if (transaction.type === 'voucher_purchase') {
        calculatedCredit -= Math.abs(transaction.amount || 0);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        trader: {
          ...trader,
          credit: calculatedCredit,
          pricing: {
            hour_price: trader.hour_price,
            day_price: trader.day_price,
            week_price: trader.week_price,
            month_price: trader.month_price
          }
        },
        users,
        sessions,
        stats: {
          totalUsers: users.length,
          activeSessions: sessions.length,
          totalDataUsed: users.reduce((sum: number, user: any) =>
            sum + (user.bytes_in || 0) + (user.bytes_out || 0), 0        
          )
        }
      },
    });
  } catch (error) {
    console.error('Error fetching trader:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trader',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/traders/[phone] - Update trader
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const body = await request.json();
    const { name, hotspotName, mikrotikId, isActive } = body;

    // Update trader using database
    const updatedTrader = await DatabaseService.updateTrader(phone, {
      name,
      hotspot_name: hotspotName,
      mikrotik_id: mikrotikId,
      is_active: isActive,
    });

    if (!updatedTrader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTrader,
      message: 'Trader updated successfully'
    });
  } catch (error) {
    console.error('Error updating trader:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update trader',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/traders/[phone] - Delete trader
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    
    // Check if trader exists first
    const trader = await DatabaseService.getTrader(phone);
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    // Delete trader (cascading deletes will handle associated data)
    await DatabaseService.deleteTrader(phone);

    return NextResponse.json({
      success: true,
      message: 'Trader and associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting trader:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete trader',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
