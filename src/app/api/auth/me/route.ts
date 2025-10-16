import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromCookies, verifyToken } from '@/lib/auth-utils';
import { DatabaseService } from '@/lib/database';

// GET /api/auth/me - Get current user info
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = extractTokenFromCookies(cookieHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No authentication token' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get fresh user data from database
    const authUser = await DatabaseService.getAuthUserById(user.id);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (authUser.type === 'trader') {
      const trader = await DatabaseService.getTrader(authUser.phone || '');
      if (!trader) {
        return NextResponse.json({
          success: true,
          data: {
            user: {
              id: authUser.id,
              type: 'trader',
              phone: authUser.phone,
              name: authUser.name,
              credit: 0,
              is_active: authUser.is_active
            }
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: authUser.id,
            type: 'trader',
            phone: trader.phone,
            name: trader.name,
            credit: trader.credit,
            is_active: trader.is_active
          }
        }
      });
    } else if (authUser.type === 'owner') {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: authUser.id,
            type: 'owner',
            name: authUser.name || 'System Owner'
          }
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid user type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
