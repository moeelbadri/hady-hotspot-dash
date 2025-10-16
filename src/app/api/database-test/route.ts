import { DatabaseService } from "@/lib/database";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Test database connection and get stats
    const stats = await DatabaseService.getDatabaseStats();
    
    // Get some sample data
    const traders = await DatabaseService.getAllTraders();
    const recentTransactions = await DatabaseService.getTransactionsByTrader("972592790902", 5);
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful!",
      stats,
      sampleData: {
        traders: traders.slice(0, 2), // First 2 traders
        recentTransactions: recentTransactions.slice(0, 3), // First 3 transactions
      }
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "create_trader":
        const newTrader = await DatabaseService.createTrader(data);
        return NextResponse.json({ success: true, data: newTrader });

      case "create_user":
        const newUser = await DatabaseService.createUser(data);
        return NextResponse.json({ success: true, data: newUser });

      case "create_transaction":
        const newTransaction = await DatabaseService.createTransaction(data);
        return NextResponse.json({ success: true, data: newTransaction });

      case "get_trader_summary":
        const summary = await DatabaseService.getTraderSummary(data.phone);
        return NextResponse.json({ success: true, data: summary });

      default:
        return NextResponse.json({ 
          success: false, 
          error: "Unknown action" 
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Database operation error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
