import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/analytics/client-activity - Get client activity report
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

    const report = await DatabaseService.getClientActivityReport(traderPhone, days);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error fetching client activity report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch client activity report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
