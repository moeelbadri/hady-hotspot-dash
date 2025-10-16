import { NextRequest, NextResponse } from 'next/server';
import { setupTradersAuth } from '@/lib/setup-traders-auth';

// POST /api/setup-traders - Setup trader authentication
export async function POST(request: NextRequest) {
  try {
    await setupTradersAuth();
    
    return NextResponse.json({
      success: true,
      message: 'Trader authentication setup complete!',
      credentials: {
        owner: {
          username: 'admin',
          password: 'admin'
        },
        traders: [
          {
            username: 'mohamed',
            password: 'mohamed123',
            phone: '972592790902'
          },
          {
            username: 'hady', 
            password: 'hady123',
            phone: '22244974444'
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error setting up trader authentication:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to setup trader authentication',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
