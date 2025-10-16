import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/clients - Get all clients
export async function GET(request: NextRequest) {
  try {
    // Get all clients by getting clients from all traders
    const traders = await DatabaseService.getAllTraders();
    const allClients = [];
    
    for (const trader of traders) {
      const clients = await DatabaseService.getClientsByTrader(trader.phone);
      allClients.push(...clients);
    }
    
    return NextResponse.json({
      success: true,
      data: allClients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, macAddress, rewardedUser, traderPhone } = body;

    if (!phone || !macAddress || !traderPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone, MAC address, and trader phone are required' },
        { status: 400 }
      );
    }

    // Check if phone is already registered
    const existingClientByPhone = await DatabaseService.getClientsByTrader(traderPhone);
    if (existingClientByPhone.some((c: any) => c.phone === phone)) {
      return NextResponse.json(
        { success: false, error: 'Phone number already registered' },
        { status: 400 }
      );
    }

    // Check if MAC address is already registered
    if (existingClientByPhone.some((c: any) => c.mac_address === macAddress)) {
      return NextResponse.json(
        { success: false, error: 'MAC address already registered' },
        { status: 400 }
      );
    }

    const client = await DatabaseService.createClient({
      phone,
      mac_address: macAddress,
      rewarded_user: rewardedUser || false,
      trader_phone: traderPhone
    });

    return NextResponse.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
