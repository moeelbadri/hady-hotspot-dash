import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/traders/[phone]/pricing - Get trader pricing
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

    return NextResponse.json({
      success: true,
      data: trader.pricing,
    });
  } catch (error) {
    console.error('Error fetching trader pricing:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trader pricing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/traders/[phone]/pricing - Update trader pricing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const body = await request.json();
    const { hour, day, week, month } = body;

    if (hour === undefined || day === undefined || week === undefined || month === undefined) {
      return NextResponse.json(
        { success: false, error: 'All pricing values (hour, day, week, month) are required' },
        { status: 400 }
      );
    }

    if (hour < 0 || day < 0 || week < 0 || month < 0) {
      return NextResponse.json(
        { success: false, error: 'Pricing values must be non-negative' },
        { status: 400 }
      );
    }

    await DatabaseService.setTraderPricing(phone, {
      hour_price: hour,
      day_price: day,
      week_price: week,
      month_price: month
    });
    
    const trader = await DatabaseService.getTrader(phone);

    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trader.pricing,
      message: 'Pricing updated successfully'
    });
  } catch (error) {
    console.error('Error updating trader pricing:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update trader pricing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
