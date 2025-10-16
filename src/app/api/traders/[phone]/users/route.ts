import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { getMikroTikAPI, getAllMikroTikDevices } from '@/lib/mikrotik-api';

// GET /api/traders/[phone]/users - Get trader's users from MikroTik
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
    const { phone } = await params;
    
    // Check if trader exists
    const trader = DatabaseService.getTrader(phone);
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }
    const users = await DatabaseService.getUsersByTrader(phone);
    
    // Try to fetch live data from MikroTik sessions
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
        
 

        // Merge live session data with user data
        const usersWithLiveData = users.map((user: any) => {
          // Find matching session for this user
          const matchingSession = traderSessions.find((session: any) => 
            session.user === user.username
          );
          
          if (matchingSession) {
            // Update user with live data
            const updatedUser = {
              ...user,
              macAddress: matchingSession.macAddress || user.macAddress,
              uptime: matchingSession.uptime || user.uptime,
              bytesIn: parseInt(matchingSession.bytesIn) || user.bytesIn,
              bytesOut: parseInt(matchingSession.bytesOut) || user.bytesOut,
              address: matchingSession.address,
              isActive: true
            };
            
            // Note: Database update would need to be done outside the map function
            // For now, we'll just return the updated user data
            
            return updatedUser;
          } else {
            // User not currently active
            return {
              ...user,
              isActive: false,
              address: null
            };
          }
        });
        
        return NextResponse.json({
          success: true,
          data: usersWithLiveData,
          source: 'mikrotik',
          activeSessions: traderSessions.length,
          totalUsers: users.length
        });
      }
    } catch (mikrotikError) {
      console.warn(`⚠️ MikroTik connection failed for trader ${phone}, using local data:`, mikrotikError);
    }
    
    // Fallback to local data
    const usersWithStatus = users.map((user: any) => ({
      ...user,
      isActive: false,
      address: null
    }));
    
    return NextResponse.json({
      success: true,
      data: usersWithStatus,
      source: 'local',
      warning: 'Using local database - MikroTik connection failed'
    });
}

// POST /api/traders/[phone]/users - Create user for trader
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
      username="", 
      password="", 
      profile = 'default', 
      macAddress = "",
      limitBytesIn = '0', 
      limitBytesOut = '0', 
      limitUptime = '0',
      limitBytesTotal = '0',
      comment = '',
      disabled = false
    } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists for this trader
    const existingUsers = await DatabaseService.getUsersByTrader(phone);
    const existingUser = existingUsers.find((user: any) => user.username === username);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this username already exists for this trader' },
        { status: 409 }
      );
    }

    const user = await DatabaseService.createUser({
      traderPhone: phone,
      username,
      password,
      profile,
      limitUptime,
      limitBytesIn,
      limitBytesOut,
      limitBytesTotal,
      comment
    });
    
    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully for trader'
    });
  } catch (error) {
    console.error('Error creating trader user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create user for trader',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
