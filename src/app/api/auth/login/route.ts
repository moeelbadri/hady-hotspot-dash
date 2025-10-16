import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { verifyPassword, generateToken, LoginCredentials } from '@/lib/auth-utils';
import { initializeAdmin } from '@/lib/init-admin';

// POST /api/auth/login - Login user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password }: { username: string; password: string } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Initialize admin user if it doesn't exist
    await initializeAdmin();

    // Find user by username
    const user = await DatabaseService.getAuthUser(username);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated. Please contact support.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      type: user.type,
      phone: user.phone,
      name: user.name
    });

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          type: user.type,
          phone: user.phone,
          name: user.name
        },
        token
      },
      message: 'Login successful'
    });

    // Set secure HTTP-only cookie
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Login failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
