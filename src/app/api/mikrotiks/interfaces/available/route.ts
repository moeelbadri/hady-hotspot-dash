import { NextRequest, NextResponse } from 'next/server';
import { getMikroTikAPI, getMikroTikDevice } from '@/lib/mikrotik-api';

// GET /api/mikrotiks/interfaces/available - Get available ethernet ports for a MikroTik device
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mikrotikId = searchParams.get('mikrotikId');

    if (!mikrotikId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'mikrotikId query parameter is required' 
        },
        { status: 400 }
      );
    }

    // Get the MikroTik device
    const device = await getMikroTikDevice(mikrotikId);
    if (!device) {
      return NextResponse.json(
        { 
          success: false, 
          error: `MikroTik device with ID ${mikrotikId} not found` 
        },
        { status: 404 }
      );
    }

    // Get API instance for the device
    const mikrotikAPI = await getMikroTikAPI(mikrotikId);

    // Get available ethernet ports
    const availablePorts = await mikrotikAPI.getAvailableEthernetPorts();

    return NextResponse.json({
      success: true,
      data: availablePorts,
      device: {
        id: device.id,
        name: device.name,
        host: device.host,
      },
      count: availablePorts.length,
    });
  } catch (error) {
    console.error('Error fetching available interfaces:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch available interfaces',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

