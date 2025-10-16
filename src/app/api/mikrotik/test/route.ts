import { NextRequest, NextResponse } from 'next/server';
import { getMikroTikAPI, getAllMikroTikDevices } from '@/lib/mikrotik-api';

// GET /api/mikrotik/test - Test MikroTik connection
export async function GET(request: NextRequest) {
  try {
    // Get the first active MikroTik device from the JSON file
    const devices = await getAllMikroTikDevices();
    if (devices.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No active MikroTik devices found',
          message: 'Please add at least one MikroTik device to the configuration'
        },
        { status: 404 }
      );
    }
    
    const device = devices[0];
    const api = await getMikroTikAPI(device.id);
    const isConnected = await api.testConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        data: {
          host: device.host,
          port: device.port,
          name: device.name,
          connected: true,
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Connection failed',
          message: 'Unable to connect to MikroTik router'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
