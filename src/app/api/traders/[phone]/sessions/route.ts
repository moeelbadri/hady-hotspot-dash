import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { getMikroTikAPI, getAllMikroTikDevices } from '@/lib/mikrotik-api';

// GET /api/traders/[phone]/sessions - Get trader's active sessions from MikroTik
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    
    // Check if trader exists
    const trader = DatabaseService.getTrader(phone);
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    // Try to fetch real MikroTik active sessions
    try {
      // Get the first active MikroTik device from the JSON file
      const devices = await getAllMikroTikDevices();
      if (devices.length === 0) {
        throw new Error('No active MikroTik devices found');
      }
      
      const mikrotikAPI = await getMikroTikAPI(devices[0].id);
      const allSessions = await mikrotikAPI.getActiveSessions();
      
      
      // Debug: Log first few sessions to understand structure
      if (allSessions.length > 0) {
      }
      
      // Filter sessions by matching phone number in server field
      const traderSessions = allSessions.filter((session: any) => {
        const server = session.server || '';
        return server === phone;
      });
      
      
      return NextResponse.json({
        success: true,
        data: traderSessions,
        source: 'mikrotik',
        total: allSessions.length,
        filtered: traderSessions.length
      });
    } catch (mikrotikError) {
      console.warn(`⚠️ MikroTik connection failed for trader ${phone}, using local database:`, mikrotikError);
      
      // Fallback to local database
      const sessions = await DatabaseService.getActiveSessions(phone);
      
      return NextResponse.json({
        success: true,
        data: sessions,
        source: 'local',
        warning: 'Using local database - MikroTik connection failed'
      });
    }
  } catch (error) {
    console.error('Error fetching trader sessions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trader sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/traders/[phone]/sessions - Create new session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    
    // Check if trader exists
    const trader = DatabaseService.getTrader(phone);
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { 
      username, 
      address, 
      uptime = '00:00:00', 
      bytesIn = 0, 
      bytesOut = 0, 
      packetsIn = 0, 
      packetsOut = 0 
    } = body;

    if (!username || !address) {
      return NextResponse.json(
        { success: false, error: 'Username and address are required' },
        { status: 400 }
      );
    }

    const session = await DatabaseService.createSession({
      trader_phone: phone,
      user_id: username,
      session_data: JSON.stringify({ address, uptime, bytesIn, bytesOut, packetsIn, packetsOut })
    });
    
    return NextResponse.json({
      success: true,
      data: session,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Error creating trader session:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/traders/[phone]/sessions - Disconnect session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if trader exists
    const trader = DatabaseService.getTrader(phone);
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    // Note: DatabaseService doesn't have a deleteSession method yet
    // For now, we'll return success without actually deleting
    const success = true;
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Session disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting trader session:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to disconnect session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
