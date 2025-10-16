import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/analytics/top-traders - Get top performing traders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const topTraders = await DatabaseService.getTopPerformingTraders(limit);

    return NextResponse.json({
      success: true,
      data: topTraders,
    });
  } catch (error) {
    console.error('Error fetching top traders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch top traders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
