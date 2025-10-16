import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

// GET /api/reports/owner - Get owner reports
export async function GET(request: NextRequest) {
  try {
    // Get all data from database
    const traders = await DatabaseService.getAllTraders();
    const allUsers: any[] = [];
    const allSessions: any[] = [];
    const allVouchers: any[] = [];
    const allTransactions: any[] = [];

    // Get data for all traders
    for (const trader of traders) {
      const [users, sessions, vouchers, transactions] = await Promise.all([
        DatabaseService.getUsersByTrader(trader.phone),
        DatabaseService.getActiveSessions(trader.phone),
        DatabaseService.getVouchersByTrader(trader.phone),
        DatabaseService.getTransactionsByTrader(trader.phone, 1000) // Get more transactions for reports
      ]);
      
      allUsers.push(...users);
      allSessions.push(...sessions);
      allVouchers.push(...vouchers);
      allTransactions.push(...transactions);
    }

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Filter transactions by date ranges
    const todayTransactions = allTransactions.filter((t: any) => 
      new Date(t.created_at) >= today
    );
    const weekTransactions = allTransactions.filter((t: any) => 
      new Date(t.created_at) >= thisWeek
    );
    const monthTransactions = allTransactions.filter((t: any) => 
      new Date(t.created_at) >= thisMonth
    );

    // Calculate system-wide revenue
    const todayRevenue = todayTransactions
      .filter((t: any) => t.type === 'voucher_purchase')
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
    
    const weekRevenue = weekTransactions
      .filter((t: any) => t.type === 'voucher_purchase')
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
    
    const monthRevenue = monthTransactions
      .filter((t: any) => t.type === 'voucher_purchase')
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

    // Trader statistics
    const activeTraders = traders.filter((t: any) => t.is_active);
    const totalCredit = traders.reduce((sum: number, trader: any) => sum + trader.credit, 0);
    const totalCreditAdded = allTransactions
      .filter((t: any) => t.type === 'credit_add')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    // Top performing traders (by revenue)
    const traderRevenue = traders.map((trader: any) => {
      const traderTransactions = allTransactions.filter((t: any) => t.trader_phone === trader.phone);
      const revenue = traderTransactions
        .filter((t: any) => t.type === 'voucher_purchase')
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
      
      return {
        phone: trader.phone,
        name: trader.name,
        revenue,
        credit: trader.credit,
        isActive: trader.is_active
      };
    }).sort((a: any, b: any) => b.revenue - a.revenue);

    // Voucher statistics
    const activeVouchers = allVouchers.filter((v: any) => !v.is_used && (!v.expires_at || new Date(v.expires_at) > now));
    const voucherDistribution = {
      hour: allVouchers.filter((v: any) => v.duration === 'hour').length,
      day: allVouchers.filter((v: any) => v.duration === 'day').length,
      week: allVouchers.filter((v: any) => v.duration === 'week').length,
      month: allVouchers.filter((v: any) => v.duration === 'month').length
    };

    // Recent system activity
    const recentActivity = allTransactions
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    const reports = {
      overview: {
        totalTraders: traders.length,
        activeTraders: activeTraders.length,
        totalUsers: allUsers.length,
        activeSessions: allSessions.length,
        totalVouchers: allVouchers.length,
        activeVouchers: activeVouchers.length,
        totalCredit,
        totalCreditAdded
      },
      revenue: {
        today: todayRevenue,
        thisWeek: weekRevenue,
        thisMonth: monthRevenue,
        total: allTransactions
          .filter((t: any) => t.type === 'voucher_purchase')
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)
      },
      traders: {
        topPerformers: traderRevenue.slice(0, 10),
        allTraders: traderRevenue
      },
      vouchers: {
        distribution: voucherDistribution,
        totalCreated: allVouchers.length,
        active: activeVouchers.length
      },
      activity: {
        recentTransactions: recentActivity,
        totalTransactions: allTransactions.length
      }
    };

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error generating owner reports:', error);
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
