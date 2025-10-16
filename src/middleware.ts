import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractTokenFromCookies, verifyToken } from './lib/auth-utils';


export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/api/auth/login',
    '/api/auth/logout'
  ];

  // Check if the current path is public
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Extract token from cookies
  const cookieHeader = request.headers.get('cookie');
  const token = extractTokenFromCookies(cookieHeader);

  // If no token, redirect to login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const user = verifyToken(token);
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Route protection based on user type
  if (pathname.startsWith('/dashboard/owner')) {
    if (user.type !== 'owner') {
      return NextResponse.redirect(new URL('/dashboard/trader', request.url));
    }
  } else if (pathname.startsWith('/dashboard/trader')) {
    if (user.type !== 'trader') {
      return NextResponse.redirect(new URL('/dashboard/owner', request.url));
    }
  }

  // Add user info to headers for API routes
  if (pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-type', user.type);
    if (user.phone) {
      requestHeaders.set('x-user-phone', user.phone);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
