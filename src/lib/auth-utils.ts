import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  type: 'owner' | 'trader';
  phone?: string;
  name?: string;
  email?: string;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { 
      id: user.id, 
      type: user.type, 
      phone: user.phone,
      name: user.name,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      type: decoded.type,
      phone: decoded.phone,
      name: decoded.name,
      email: decoded.email
    };
  } catch (error) {
    return null;
  }
}

// Extract token from request headers
export function extractTokenFromHeaders(headers: Headers): string | null {
  const authorization = headers.get('authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.substring(7);
  }
  return null;
}

// Extract token from cookies
export function extractTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies.authToken || null;
}
