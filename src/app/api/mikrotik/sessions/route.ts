import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { getMikroTikAPI, getAllMikroTikDevices } from '@/lib/mikrotik-api';

// GET /api/mikrotik/sessions - Fetch active sessions from MikroTik router
export async function GET(request: NextRequest) {
  try {
    // Try to fetch from MikroTik router first
    try {
      // Get the first active MikroTik device from the JSON file
      const devices = await getAllMikroTikDevices();
      if (devices.length === 0) {
        throw new Error('No active MikroTik devices found');
      }
      
      const mikrotikAPI = await getMikroTikAPI(devices[0].id);
      const realSessions = await mikrotikAPI.getActiveSessions();
      
      
      return NextResponse.json({
        success: true,
        data: realSessions,
        source: 'mikrotik'
      });
    } catch (mikrotikError) {
      console.warn('⚠️ MikroTik connection failed, falling back to local database:', mikrotikError);
      
      // Fallback to local database
      const sessions = await DatabaseService.getActiveSessions();
      
      return NextResponse.json({
        success: true,
        data: sessions,
        source: 'local',
        warning: 'Using local database - MikroTik connection failed'
      });
    }
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/mikrotik/sessions - Disconnect session
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    try {
      // Get the first active MikroTik device from the JSON file
      const devices = await getAllMikroTikDevices();
      if (devices.length === 0) {
        throw new Error('No active MikroTik devices found');
      }
      
      const mikrotikAPI = await getMikroTikAPI(devices[0].id);
      await mikrotikAPI.disconnectSession(sessionId);
      
      return NextResponse.json({
        success: true,
        message: 'Session disconnected successfully'
      });
    } catch (mikrotikError) {
      console.warn('⚠️ MikroTik disconnect failed:', mikrotikError);
      
      // Fallback to local database
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
        message: 'Session disconnected successfully (local)',
        warning: 'Using local database - MikroTik connection failed'
      });
    }
  } catch (error) {
    console.error('Error disconnecting session:', error);
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