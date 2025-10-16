import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/mikrotiks - Get all MikroTik routers
export async function GET() {
  try {
    const mikrotiks = await DatabaseService.getAllMikroTiks();
    
    return NextResponse.json({
      success: true,
      data: mikrotiks
    });
  } catch (error) {
    console.error('Error fetching MikroTik routers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MikroTik routers' },
      { status: 500 }
    );
  }
}

// POST /api/mikrotiks - Create new MikroTik router
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, host, username, password, port = 8728, description, isActive = true } = body;

    if (!name || !host || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, host, username, and password are required' },
        { status: 400 }
      );
    }

    // Check if MikroTik with same host already exists
    const existingMikrotiks = await DatabaseService.getAllMikroTiks();
    const existingMikrotik = existingMikrotiks.find((m: any) => m.host === host);
    
    if (existingMikrotik) {
      return NextResponse.json(
        { success: false, error: 'MikroTik router with this host already exists' },
        { status: 409 }
      );
    }

    // Create MikroTik router in database
    
    const mikrotik = await DatabaseService.createMikroTik({
      name,
      host,
      username,
      password,
      port,
      description,
      isActive
    });


    return NextResponse.json({
      success: true,
      data: mikrotik,
      message: 'MikroTik router created successfully'
    });
  } catch (error) {
    console.error('Error creating MikroTik router:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create MikroTik router' },
      { status: 500 }
    );
  }
}
