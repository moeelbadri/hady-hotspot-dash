import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { getMikroTikAPI, getAllMikroTikDevices } from '@/lib/mikrotik-api';

// GET /api/clients/trader/[phone] - Get clients for specific trader with live session data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Trader phone is required' },
        { status: 400 }
      );
    }

    const clients = await DatabaseService.getClientsByTrader(phone);
    
    // Try to fetch live session data from MikroTik
    try {
      const devices = await getAllMikroTikDevices();
      if (devices.length > 0) {
        const mikrotikAPI = await getMikroTikAPI(devices[0].id);
        const activeSessions = await mikrotikAPI.getActiveSessions();
        
        // Filter sessions for this trader
        const traderSessions = activeSessions.filter((session: any) => {
          const server = session.server || '';
          return server === phone;
        });
        
        
        // Merge clients with live session data
        const clientsWithSessions = clients.map((client: any) => {
          // Find matching session for this client (by MAC address)
          const matchingSession = traderSessions.find((session: any) => 
            session.macAddress === client.macAddress
          );
          
          if (matchingSession) {
            return {
              ...client,
              isActive: true,
              sessionData: {
                username: matchingSession.user,
                address: matchingSession.address,
                uptime: matchingSession.uptime,
                bytesIn: parseInt(matchingSession.bytesIn),
                bytesOut: parseInt(matchingSession.bytesOut)
              }
            };
          } else {
            return {
              ...client,
              isActive: false,
              sessionData: null
            };
          }
        });
        
        return NextResponse.json({
          success: true,
          data: clientsWithSessions,
          source: 'mikrotik',
          activeSessions: traderSessions.length,
          totalClients: clients.length
        });
      }
    } catch (mikrotikError) {
      console.warn(`⚠️ MikroTik connection failed for trader ${phone}, using local data:`, mikrotikError);
    }
    
    // Fallback to local data
    const clientsWithStatus = clients.map((client: any) => ({
      ...client,
      isActive: false,
      sessionData: null
    }));
    
    return NextResponse.json({
      success: true,
      data: clientsWithStatus,
      source: 'local',
      warning: 'Using local database - MikroTik connection failed'
    });
  } catch (error) {
    console.error('Error fetching trader clients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trader clients' },
      { status: 500 }
    );
  }
}
