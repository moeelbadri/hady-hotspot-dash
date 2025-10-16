import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// POST /api/traders/[phone]/discounts/calculate - Calculate discounted price
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const body = await request.json();
    const { category, basePrice } = body;

    // Validation
    if (!category || basePrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Category and basePrice are required' },
        { status: 400 }
      );
    }

    if (!['hour', 'day', 'week', 'month'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category. Must be "hour", "day", "week", or "month"' },
        { status: 400 }
      );
    }

    if (typeof basePrice !== 'number' || basePrice < 0) {
      return NextResponse.json(
        { success: false, error: 'BasePrice must be a non-negative number' },
        { status: 400 }
      );
    }

    // Calculate discounted price
    const priceCalculation = await DatabaseService.calculateDiscountedPrice(
      phone,
      category,
      basePrice
    );

    return NextResponse.json({
      success: true,
      data: priceCalculation
    });

  } catch (error) {
    console.error('Error calculating discounted price:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate discounted price' },
      { status: 500 }
    );
  }
}
