import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { getMikroTikClient, getAllMikroTikDevices } from '@/lib/mikrotik-api';
import { sendWhatsAppMessage } from '@/lib/whatsapp-bot';
import { QueryClient } from '@tanstack/react-query';

// POST /api/vouchers/create - Create voucher for trader
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { traderPhone, duration, quantity = 1 } = body;

    if (!traderPhone || !duration || !['hour', 'day', 'week', 'month'].includes(duration)) {
      return NextResponse.json(
        { success: false, error: 'Trader phone and valid duration are required' },
        { status: 400 }
      );
    }

    if (quantity < 1 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a positive integer' },
        { status: 400 }
      );
    }

    // Check if trader exists
    const trader = await DatabaseService.getTrader(traderPhone);
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    // Get pricing for this trader
    const pricing = await DatabaseService.getTraderPricing(traderPhone);
    
    // Get base price for duration
    const durationKey = `${duration}_price` as keyof typeof pricing;
    const basePrice = pricing[durationKey];
    // Calculate discounted price
    const priceCalculation = await DatabaseService.calculateDiscountedPrice(
      traderPhone, 
      duration, 
      basePrice
    );
    // Apply quantity to the final price
    const price = priceCalculation.finalPrice * quantity;
    // Calculate current credit from transactions
    const transactions = await DatabaseService.getTransactionsByTrader(traderPhone);
    let currentCredit = 0;
    transactions.forEach((transaction: any) => {
      if (transaction.type === 'credit_add') {
        currentCredit += Math.abs(transaction.amount || 0);
      } else if (transaction.type === 'voucher_purchase') {
        currentCredit -= Math.abs(transaction.amount || 0);
      }
    });

    // Check if trader has enough credit
    if (currentCredit < price) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credit' },
        { status: 400 }
      );
    }

    // Generate username and password if not provided

    // Create user in MikroTik hotspot
    let mikrotikApiUser = null;
    let username = "";
    const baseDurationInSeconds = duration === 'hour' ? 3600 : duration === 'day' ? 86400 : duration === 'week' ? 604800 : 2592000;
    const durationInSeconds = baseDurationInSeconds * quantity;

    try {
      // Get the first active MikroTik device
      const devices = await getAllMikroTikDevices();
      if (devices.length === 0) {
        throw new Error('No active MikroTik devices found');
      }
      
      const client = await getMikroTikClient(devices[0].id);

      // Create hotspot user with trader phone in comment
      let numbers = Array.from({length: 4}, () => Math.floor(Math.random() * 10));
      let letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      let pos = Math.floor(Math.random() * 5);
      numbers.splice(pos, 0, letter as any);
      username = numbers.join('');

      mikrotikApiUser = await client.menu('/ip/hotspot/user').add({
        name: username,
        // password: finalPassword,
        profile: "default",
        limitUptime: durationInSeconds.toString(),
        server: traderPhone,
        comment: traderPhone,
        disabled: 'false'
      });

    } catch (mikrotikError) {
      console.warn('⚠️ Failed to create MikroTik user, continuing with voucher creation:', mikrotikError);
    }
    // Create user record
    const mikroTikUser = await DatabaseService.createUser({
      traderPhone,
      username: username,
      password: "",
      profile: "default",
      limitUptime: durationInSeconds.toString(),
      limitBytesIn: "0",
      limitBytesOut: "0",
      limitBytesTotal: "0",
      comment: `Voucher user for ${duration} voucher`
    });

    // Credit is now calculated dynamically from transactions, no need to update
    const newCredit = currentCredit - price;
    
    if (isNaN(newCredit) || newCredit < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid credit calculation' },
        { status: 400 }
      );
    }

    // Create transaction record
    const transaction = await DatabaseService.createTransaction({
      trader_phone: traderPhone,
      type: 'voucher_purchase',
      amount: -price,
      description: `Voucher created: ${quantity} ${duration}${quantity > 1 ? 's' : ''} - $${price} - dashboard`,
      voucher_id: mikroTikUser.id
    });

    const arabicDuration = duration === 'hour' ? 'ساعة' : duration === 'day' ? 'يوم' : duration === 'week' ? 'اسبوع' : 'شهر';
    // Send WhatsApp notification to trader about voucher creation
    try {
      const response: string = `تم خصم من رصيدك: ${price} $

      ✅ هذا هو  
      🔑 الكود: ${username}  
      ⏳ المدة: ${quantity} ${arabicDuration} 

      الرصيد الحالي: ${newCredit}$  
      شكراً لك .`

      await sendWhatsAppMessage(traderPhone, response);
    } catch (whatsappError) {
      console.warn('⚠️ Failed to send WhatsApp notification:', whatsappError);
      // Don't fail the voucher creation if WhatsApp fails
    }

    // Invalidate React Query caches to refresh dashboard data
    try {
      const queryClient = new QueryClient();
      await queryClient.invalidateQueries({ queryKey: ['traderStats'] });
      await queryClient.invalidateQueries({ queryKey: ['traderUsers'] });
      await queryClient.invalidateQueries({ queryKey: ['traderSessions'] });
      await queryClient.invalidateQueries({ queryKey: ['ownerReports'] });
      await queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      await queryClient.invalidateQueries({ queryKey: ['allSessions'] });
      await queryClient.invalidateQueries({ queryKey: ['allTraders'] });
    } catch (queryError) {
      console.warn('⚠️ Failed to invalidate React Query caches:', queryError);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: mikroTikUser,
        transaction,
        mikrotikApiUser,
        newCredit: newCredit
      },
      message: mikrotikApiUser 
        ? 'Voucher and MikroTik user created successfully' 
        : 'Voucher created successfully (MikroTik user creation failed)'
    });
  } catch (error) {
    console.error('Error creating voucher:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create voucher',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
