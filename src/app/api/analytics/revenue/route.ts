import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/analytics/revenue - Get revenue analytics for a trader
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traderPhone = searchParams.get('traderPhone');
    const days = parseInt(searchParams.get('days') || '30');

    if (!traderPhone) {
      return NextResponse.json(
        { success: false, error: 'Trader phone is required' },
        { status: 400 }
      );
    }

    const analytics = await DatabaseService.getRevenueAnalytics(traderPhone, days);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch revenue analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
