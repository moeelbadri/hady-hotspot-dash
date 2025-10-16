import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import bcrypt from 'bcrypt';

// GET /api/traders - Get all traders
export async function GET(request: NextRequest) {
  try {
    const traders = await DatabaseService.getAllTraders();
    
    // Calculate credit for each trader based on transactions
    const tradersWithCalculatedCredit = await Promise.all(
      traders.map(async (trader: { phone: string; }) => {
        try {
          // Get all transactions for this trader
          const transactions = await DatabaseService.getTransactionsByTrader(trader.phone);
          
          // Calculate credit balance from transactions
          let calculatedCredit = 0;
          transactions.forEach((transaction: any) => {
            if (transaction.type === 'credit_add') {
              calculatedCredit += Math.abs(transaction.amount || 0);
            } else if (transaction.type === 'voucher_purchase') {
              calculatedCredit -= Math.abs(transaction.amount || 0);
            }
          });
          
          return {
            ...trader,
            credit: calculatedCredit
          };
        } catch (error) {
          console.error(`Error calculating credit for trader ${trader.phone}:`, error);
          // Return trader with original credit if calculation fails
          return trader;
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      data: tradersWithCalculatedCredit,
    });
  } catch (error) {
    console.error('Error fetching traders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch traders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/traders - Create new trader
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      phone, 
      password,
      hotspotName, 
      mikrotikHost, 
      mikrotikUsername, 
      mikrotikPassword, 
      mikrotikPort = 8728,
      mikrotikId
    } = body;

    if (!name || !phone || !password || !hotspotName || !mikrotikHost || !mikrotikUsername || !mikrotikPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name, phone, password, hotspotName, mikrotikHost, mikrotikUsername, and mikrotikPassword are required' 
        },
        { status: 400 }
      );
    }

    // Check if trader already exists
    const existingTrader = await DatabaseService.getTrader(phone);
    if (existingTrader) {
      return NextResponse.json(
        { success: false, error: 'Trader with this phone number already exists' },
        { status: 409 }
      );
    }

    let trader;
    
    if (mikrotikId) {
      // Use existing MikroTik device
      trader = await DatabaseService.createTrader({
        phone,
        name,
        hotspot_name: hotspotName,
        mikrotik_id: mikrotikId,
      });
    } else {
      // Create new MikroTik device and trader
      trader = await DatabaseService.createTraderWithMikroTik({
        phone,
        name,
        hotspot_name: hotspotName,
        mikrotik_host: mikrotikHost,
        mikrotik_username: mikrotikUsername,
        mikrotik_password: mikrotikPassword,
        mikrotik_port: mikrotikPort,
      });
    }

    // Create auth user for the trader
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      await DatabaseService.createAuthUser({
        username: phone, // Use phone as username
        password: hashedPassword,
        type: 'trader',
        phone: phone,
        name: name,
      });
      
    } catch (authError) {
      console.warn('⚠️ Failed to create auth user, but trader was created:', authError);
    }
    
    return NextResponse.json({
      success: true,
      data: trader,
      message: 'Trader created successfully'
    });
  } catch (error) {
    console.error('Error creating trader:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create trader',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
