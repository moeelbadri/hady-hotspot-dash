import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { createMikroTikAPI } from '@/lib/mikrotik-api';

// GET /api/reports/trader/[phone] - Get trader reports
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const trader = await DatabaseService.getTrader(phone);
    
    if (!trader) {
      return NextResponse.json(
        { success: false, error: 'Trader not found' },
        { status: 404 }
      );
    }

    // Get real MikroTik data first, fallback to local data
    let users: any[] = [];
    let sessions: any[] = [];
    
    try {
      // Use the MikroTik device linked to the trader
      const mikrotikAPI = createMikroTikAPI({
        id: trader.mikrotik_id,
        name: trader.mikrotik_name,
        host: trader.mikrotik_host,
        port: trader.mikrotik_port,
        username: trader.mikrotik_username,
        password: trader.mikrotik_password,
        isActive: trader.mikrotik_is_active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const [realUsers, realSessions] = await Promise.all([
        mikrotikAPI.getHotspotUsers(),
        mikrotikAPI.getActiveSessions()
      ]);

      // Filter data for this trader
      users = realUsers.filter((user: any) => 
        user.comment && user.comment.includes(phone)
      );
      sessions = realSessions.filter((session: any) => 
        session.user && session.user.includes(phone)
      );

    } catch (mikrotikError) {
      console.warn(`⚠️ MikroTik data failed for trader ${phone}, using local data:`, mikrotikError);
      
      // Fallback to local data
      users = await DatabaseService.getUsersByTrader(phone);
      sessions = await DatabaseService.getActiveSessions(phone);
    }

    // Get local data for vouchers and transactions
    const vouchers = await DatabaseService.getVouchersByTrader(phone);
    const transactions = await DatabaseService.getTransactionsByTrader(phone);

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Filter transactions by date ranges
    const todayTransactions = transactions.filter((t: any) =>
      new Date(t.created_at) >= today
    );
    const weekTransactions = transactions.filter((t: any) =>
      new Date(t.created_at) >= thisWeek
    );
    const monthTransactions = transactions.filter((t: any) => 
      new Date(t.created_at) >= thisMonth
    );

    // Calculate revenue from real transactions
    const todayRevenue = todayTransactions
      .filter((t: any) => t.type === 'voucher_purchase')
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
    
    const weekRevenue = weekTransactions
      .filter((t: any) => t.type === 'voucher_purchase')
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
    
    const monthRevenue = monthTransactions
      .filter((t: any) => t.type === 'voucher_purchase')
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

    // Calculate total revenue from all transactions
    const totalRevenue = transactions
      .filter((t: any) => t.type === 'voucher_purchase')
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

    // Calculate voucher statistics
    const activeVouchers = vouchers.filter((v: any) => v.is_active && new Date(v.expires_at) > now);
    const expiredVouchers = vouchers.filter((v: any) => new Date(v.expires_at) <= now);
    
    // Voucher distribution by duration
    const voucherDistribution = {
      hour: vouchers.filter((v: any) => v.duration === 'hour').length,
      day: vouchers.filter((v: any) => v.duration === 'day').length,
      week: vouchers.filter((v: any) => v.duration === 'week').length,
      month: vouchers.filter((v: any) => v.duration === 'month').length
    };

    // Recent activity (last 10 transactions)
    const recentActivity = transactions
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    const reports = {
      overview: {
        credit: trader.credit,
        totalUsers: users.length,
        activeSessions: sessions.length,
        totalVouchers: vouchers.length,
        activeVouchers: activeVouchers.length,
        expiredVouchers: expiredVouchers.length,
        totalTransactions: transactions.length,
        dataSource: 'mikrotik' // Indicates if using real MikroTik data
      },
      revenue: {
        today: todayRevenue,
        thisWeek: weekRevenue,
        thisMonth: monthRevenue,
        total: totalRevenue
      },
      vouchers: {
        distribution: voucherDistribution,
        totalCreated: vouchers.length,
        active: activeVouchers.length,
        expired: expiredVouchers.length
      },
      activity: {
        recentTransactions: recentActivity,
        totalTransactions: transactions.length
      }
    };

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error generating trader reports:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
