import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/traders/[phone]/discounts/[id] - Get a specific discount
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string; id: string }> }
) {
  try {
    const { phone, id } = await params;
    
    const discount = await DatabaseService.getDiscount(id);
    if (!discount) {
      return NextResponse.json(
        { success: false, error: 'Discount not found' },
        { status: 404 }
      );
    }

    // Verify the discount belongs to the trader
    if (discount.trader_phone !== phone) {
      return NextResponse.json(
        { success: false, error: 'Discount does not belong to this trader' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: discount
    });
  } catch (error) {
    console.error('Error fetching discount:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch discount',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/traders/[phone]/discounts/[id] - Update a discount
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string; id: string }> }
) {
  try {
    const { phone, id } = await params;
    const body = await request.json();
    const { name, description, discount_type, discount_value, category, start_time, end_time, is_active } = body;

    // Check if discount exists and belongs to trader
    const existingDiscount = await DatabaseService.getDiscount(id);
    if (!existingDiscount) {
      return NextResponse.json(
        { success: false, error: 'Discount not found' },
        { status: 404 }
      );
    }

    if (existingDiscount.trader_phone !== phone) {
      return NextResponse.json(
        { success: false, error: 'Discount does not belong to this trader' },
        { status: 403 }
      );
    }

    // Validation for provided fields
    if (discount_type && !['percentage', 'fixed_amount'].includes(discount_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid discount type. Must be "percentage" or "fixed_amount"' },
        { status: 400 }
      );
    }

    if (category && !['hour', 'day', 'week', 'month'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category. Must be "hour", "day", "week", or "month"' },
        { status: 400 }
      );
    }

    if (discount_type === 'percentage' && discount_value !== undefined && (discount_value < 0 || discount_value > 100)) {
      return NextResponse.json(
        { success: false, error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (discount_type === 'fixed_amount' && discount_value !== undefined && discount_value < 0) {
      return NextResponse.json(
        { success: false, error: 'Fixed amount discount must be non-negative' },
        { status: 400 }
      );
    }

    // Validate date range if both are provided
    if (start_time && end_time) {
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { success: false, error: 'Start time must be before end time' },
          { status: 400 }
        );
      }
    }

    const updatedDiscount = await DatabaseService.updateDiscount(id, {
      name,
      description,
      discount_type,
      discount_value,
      category,
      start_time,
      end_time,
      is_active
    });

    return NextResponse.json({
      success: true,
      data: updatedDiscount,
      message: 'Discount updated successfully'
    });
  } catch (error) {
    console.error('Error updating discount:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update discount',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/traders/[phone]/discounts/[id] - Delete a discount
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string; id: string }> }
) {
  try {
    const { phone, id } = await params;
    
    // Check if discount exists and belongs to trader
    const existingDiscount = await DatabaseService.getDiscount(id);
    if (!existingDiscount) {
      return NextResponse.json(
        { success: false, error: 'Discount not found' },
        { status: 404 }
      );
    }

    if (existingDiscount.trader_phone !== phone) {
      return NextResponse.json(
        { success: false, error: 'Discount does not belong to this trader' },
        { status: 403 }
      );
    }

    await DatabaseService.deleteDiscount(id);

    return NextResponse.json({
      success: true,
      message: 'Discount deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete discount',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
