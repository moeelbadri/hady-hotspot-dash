import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import bcrypt from 'bcrypt';
import { getMikroTikAPI, getMikroTikClient } from '@/lib/mikrotik-api';

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
      hotspotName, // Kept for backward compatibility, but will use phone if not provided
      mikrotikHost, 
      mikrotikUsername, 
      mikrotikPassword, 
      mikrotikPort = 8728,
      mikrotikId,
      ethernetPort1
    } = body;
     const ethernetPort = "vlan60"
    if (!name || !phone || !password || !mikrotikHost || !mikrotikUsername || !mikrotikPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name, phone, password, mikrotikHost, mikrotikUsername, and mikrotikPassword are required' 
        },
        { status: 400 }
      );
    }

    // Validate phone number starts with country code
    // Must be 10-15 digits, starting with country code (1-9)
    const cleanedPhone = phone.replace(/[\s-]/g, '');
    const phoneRegex = /^\d{5,15}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Phone number must include country code (e.g., 2224567890). Must be 5-15 digits.' 
        },
        { status: 400 }
      );
    }
    // Use phone number as hotspot name (remove any spaces, dashes, or plus signs for hotspot name)
    const hotspotNameFinal = hotspotName || cleanedPhone.replace('+', '');

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
        hotspot_name: hotspotNameFinal,
        mikrotik_id: mikrotikId,
      });

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

    // Create default trader pricing
    try {
      await DatabaseService.setTraderPricing(phone, {
        hour_price: 1.0,    // Default 1.0 for 1 hour
        day_price: 5.0,     // Default 5.0 for 1 day
        week_price: 25.0,   // Default 25.0 for 1 week
        month_price: 80.0,  // Default 80.0 for 1 month
      });
    } catch (pricingError) {
      console.warn('⚠️ Failed to create trader pricing, but trader was created:', pricingError);
    }
        // Get all addresses used with comment "hotspot-hady" and return IP block
        // Only check if mikrotikId was provided
        try {
        const mikrotikAPI = await getMikroTikAPI(mikrotikId);
        const ipBlock = await mikrotikAPI.getHighestHotspotIP('hotspot-hady');
        console.log(`✅ IP block determined: ${ipBlock} for MikroTik ${mikrotikId}`);

        // create address pool for the trader
        try {
          const mikrotikClient = await getMikroTikClient(mikrotikId);
          await mikrotikClient.menu('/ip/pool').add({
            name: `${phone}-pool`,
            ranges: `${ipBlock}5-${ipBlock}254`,
            comment: `Trader: ${name} (${phone})`
          });
          console.log(`✅ Address pool created: ${ipBlock}5-${ipBlock}254 for trader ${name}`);


          // create address list for the trader
          try {
            const mikrotikClient = await getMikroTikClient(mikrotikId);
            await mikrotikClient.menu('/ip/address').add({
              address: `${ipBlock}1/24`,
              network: `${ipBlock}0`,
              interface: ethernetPort,
              comment: `Trader: ${name} (${phone})`
            });
            console.log(`✅ Address list created: ${ipBlock}1/24 for trader ${name}`);
            // create masquerade nat rule for the trader
            try {
              const mikrotikClient = await getMikroTikClient(mikrotikId);
              await mikrotikClient.menu('/ip/firewall/nat').add({
                chain: 'srcnat',
                src_address: `${ipBlock}1/24`,
                action: 'masquerade',
              });
            } catch (masqueradeError) {
              console.warn('⚠️ Failed to create masquerade nat rule, but trader was created:', masqueradeError);
            }
          } catch (listError) {
            console.warn('⚠️ Failed to create address list, but trader was created:', listError);
          }
        } catch (poolError) {
          console.warn('⚠️ Failed to create address pool, but trader was created:', poolError);
        }
        console.log(`✅ Masquerade nat rule created: ${phone}-masquerade for trader ${name}`);
        
      } catch (ipError) {
        console.warn('⚠️ Failed to get highest hotspot IP, but trader was created:', ipError);
      }
      
        // Create MikroTik hotspot user for the trader
        try {
          const mikrotikClient = await getMikroTikClient(mikrotikId);
  
          await mikrotikClient.menu('/ip/hotspot/user').add({
            name: phone,
            password: password,
            profile: 'default',
            comment: `Trader: ${name} (${phone})`
          });
        } catch (mikrotikError) {
          console.warn('⚠️ Failed to create MikroTik hotspot user, but trader was created:', mikrotikError);
        }
      
    }
    
    return NextResponse.json({
      success: true,
      data: trader,
      message: 'Trader created successfully',
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
