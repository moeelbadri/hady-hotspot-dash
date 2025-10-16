import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/analytics/voucher-usage - Get voucher usage analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traderPhone = searchParams.get('traderPhone');

    const analytics = await DatabaseService.getVoucherUsageAnalytics(traderPhone || undefined);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching voucher usage analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch voucher usage analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
