import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/analytics/performance - Get trader performance metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traderPhone = searchParams.get('traderPhone');

    if (!traderPhone) {
      return NextResponse.json(
        { success: false, error: 'Trader phone is required' },
        { status: 400 }
      );
    }

    const metrics = await DatabaseService.getTraderPerformanceMetrics(traderPhone);

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
