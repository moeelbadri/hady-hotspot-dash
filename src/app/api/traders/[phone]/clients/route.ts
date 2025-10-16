import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { getMikroTikAPI, getAllMikroTikDevices } from '@/lib/mikrotik-api';

// GET /api/traders/[phone]/clients - Get trader's clients
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

    // Get clients for this trader
    const clients = await DatabaseService.getClientsByTrader(phone);
    
    // Try to get active sessions from MikroTik to populate session info
    let clientsWithSessions = clients;
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
        
        
        // Merge session data with clients
        clientsWithSessions = clients.map((client: any) => {
          // Find matching session for this client by phone number
          const matchingSession = traderSessions.find((session: any) => {
            // Try to match by phone number in session data or by username
            return session.user === client.phone || 
                   session.server === phone ||
                   (session.address && session.address.includes(client.phone));
          });
          
          if (matchingSession) {
            return {
              ...client,
              isActive: true,
              sessionData: {
                address: matchingSession.address,
                username: matchingSession.user,
                uptime: matchingSession.uptime,
                bytesIn: parseInt(matchingSession.bytesIn) || 0,
                bytesOut: parseInt(matchingSession.bytesOut) || 0,
                macAddress: matchingSession.macAddress
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
      }
    } catch (mikrotikError) {
      console.warn('Could not fetch MikroTik sessions, using database data only:', mikrotikError);
      // If MikroTik is not available, just return clients without session data
      clientsWithSessions = clients.map((client: any) => ({
        ...client,
        isActive: false,
        sessionData: null
      }));
    }
    
    return NextResponse.json({
      success: true,
      data: clientsWithSessions,
      total: clientsWithSessions.length
    });
  } catch (error) {
    console.error('Error fetching trader clients:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trader clients',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/traders/[phone]/clients - Create client for trader
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
    const { phone: clientPhone, macAddress, rewardedUser = false } = body;

    if (!clientPhone || !macAddress) {
      return NextResponse.json(
        { success: false, error: 'Phone and MAC address are required' },
        { status: 400 }
      );
    }

    // Check if phone is already registered for this trader
    const existingClients = await DatabaseService.getClientsByTrader(phone);
    if (existingClients.some((c: any) => c.phone === clientPhone)) {
      return NextResponse.json(
        { success: false, error: 'Phone number already registered for this trader' },
        { status: 400 }
      );
    }

    // Check if MAC address is already registered for this trader
    if (existingClients.some((c: any) => c.mac_address === macAddress)) {
      return NextResponse.json(
        { success: false, error: 'MAC address already registered for this trader' },
        { status: 400 }
      );
    }

    const client = await DatabaseService.createClient({
      phone: clientPhone,
      mac_address: macAddress,
      rewarded_user: rewardedUser,
      trader_phone: phone
    });

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Client created successfully for trader'
    });
  } catch (error) {
    console.error('Error creating trader client:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create client for trader',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
