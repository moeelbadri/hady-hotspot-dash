import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/traders/[phone]/discounts - Get all discounts for a trader
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    
    // Check if trader exists
    const trader = await DatabaseService.getTrader(phone);
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    const discounts = await DatabaseService.getTraderDiscounts(phone);
    
    return NextResponse.json({
      success: true,
      data: discounts
    });
  } catch (error) {
    console.error('Error fetching trader discounts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch discounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/traders/[phone]/discounts - Create a new discount for a trader
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const body = await request.json();
    const { name, description, discount_type, discount_value, category, start_time, end_time } = body;

    // Validation
    if (!name || !discount_type || discount_value === undefined || !category || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    if (!['percentage', 'fixed_amount'].includes(discount_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid discount type. Must be "percentage" or "fixed_amount"' },
        { status: 400 }
      );
    }

    if (!['hour', 'day', 'week', 'month'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category. Must be "hour", "day", "week", or "month"' },
        { status: 400 }
      );
    }

    if (discount_type === 'percentage' && (discount_value < 0 || discount_value > 100)) {
      return NextResponse.json(
        { success: false, error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (discount_type === 'fixed_amount' && discount_value < 0) {
      return NextResponse.json(
        { success: false, error: 'Fixed amount discount must be non-negative' },
        { status: 400 }
      );
    }

    // Check if trader exists
    const trader = await DatabaseService.getTrader(phone);
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    // Validate date range
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    const discount = await DatabaseService.createDiscount({
      trader_phone: phone,
      name,
      description,
      discount_type,
      discount_value,
      category,
      start_time,
      end_time
    });

    // Send WhatsApp notification to trader about the new discount
    try {
      const discountMessage = `🎉 تم إنشاء خصم جديد!

📋 الاسم: ${name}
${description ? `📝 الوصف: ${description}` : ''}
💰 الخصم: ${discount_type === 'percentage' ? `${discount_value}%` : `$${discount_value}`}
📦 الفئة: ${category === 'hour' ? 'ساعة' : category === 'day' ? 'يوم' : category === 'week' ? 'أسبوع' : 'شهر'}
⏰ من: ${new Date(start_time).toLocaleString('en-US', { 
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit', 
  hour: '2-digit', 
  minute: '2-digit' 
})}
⏰ إلى: ${new Date(end_time).toLocaleString('en-US', { 
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit', 
  hour: '2-digit', 
  minute: '2-digit' 
})}

استمتع بالخصم! 🎊`;

      // Add message to queue for WhatsApp bot
      await DatabaseService.addMessageToQueue(phone, discountMessage);
    } catch (error) {
      console.error('Failed to send discount notification:', error);
      // Don't fail the discount creation if notification fails
    }

    return NextResponse.json({
      success: true,
      data: discount,
      message: 'Discount created successfully'
    });
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create discount',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
