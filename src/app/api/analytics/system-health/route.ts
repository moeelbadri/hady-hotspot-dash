import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/analytics/system-health - Get system health metrics
export async function GET(request: NextRequest) {
  try {
    const metrics = await DatabaseService.getSystemHealthMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching system health metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch system health metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
