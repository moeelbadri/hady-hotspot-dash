import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/mikrotiks/[id] - Get specific MikroTik router
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mikrotik = await DatabaseService.getMikroTikById(id);
    
    if (!mikrotik) {
      return NextResponse.json(
        { success: false, error: 'MikroTik router not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mikrotik
    });
  } catch (error) {
    console.error('Error fetching MikroTik router:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MikroTik router' },
      { status: 500 }
    );
  }
}

// PUT /api/mikrotiks/[id] - Update MikroTik router
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, host, username, password, port, description, isActive } = body;

    // Update MikroTik router
    const updatedMikrotik = await DatabaseService.updateMikroTik(id, {
      name,
      host,
      username,
      password,
      port,
      description,
      isActive
    });

    if (!updatedMikrotik) {
      return NextResponse.json(
        { success: false, error: 'MikroTik router not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMikrotik,
      message: 'MikroTik router updated successfully'
    });
  } catch (error) {
    console.error('Error updating MikroTik router:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update MikroTik router' },
      { status: 500 }
    );
  }
}

// DELETE /api/mikrotiks/[id] - Delete MikroTik router
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if MikroTik exists first
    const mikrotik = await DatabaseService.getMikroTikById(id);
    if (!mikrotik) {
      return NextResponse.json(
        { success: false, error: 'MikroTik router not found' },
        { status: 404 }
      );
    }

    // Delete MikroTik router
    await DatabaseService.deleteMikroTik(id);

    return NextResponse.json({
      success: true,
      message: 'MikroTik router deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting MikroTik router:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete MikroTik router' },
      { status: 500 }
    );
  }
}
