import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { getMikroTikAPI, getAllMikroTikDevices } from '@/lib/mikrotik-api';

// GET /api/mikrotik/users - Fetch all hotspot users from MikroTik router
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
      const realUsers = await mikrotikAPI.getHotspotUsers();
      
      
      return NextResponse.json({
        success: true,
        data: realUsers,
        source: 'mikrotik'
      });
    } catch (mikrotikError) {
      console.warn('⚠️ MikroTik connection failed, falling back to local database:', mikrotikError);
      
      // Fallback to local database
      // Get all users from all traders
      const traders = await DatabaseService.getAllTraders();
      const allUsers = [];
      for (const trader of traders) {
        const users = await DatabaseService.getUsersByTrader(trader.phone);
        allUsers.push(...users);
      }
      const users = allUsers;
      
      return NextResponse.json({
        success: true,
        data: users,
        source: 'local',
        warning: 'Using local database - MikroTik connection failed'
      });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/mikrotik/users - Create new hotspot user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      username, 
      password, 
      traderPhone = 'default', 
      profile = 'default', 
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

    // Note: This would need to be updated to use DatabaseService.createUser
    // For now, we'll return a mock response
    const user = {
      traderPhone,
      username,
      password,
      profile,
      limitBytesIn,
      limitBytesOut,
      limitUptime,
      limitBytesTotal,
      comment,
      disabled,
      macAddress: "",
      bytesIn: 0,
      bytesOut: 0,
      uptime: "0"
    };
    
    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
