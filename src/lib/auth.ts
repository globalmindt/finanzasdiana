import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET as Secret;

if (!JWT_SECRET) {
  console.warn('JWT_SECRET not set. Auth routes will fail until configured.');
}

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: object, expiresIn: number = 60 * 60 * 24 * 7) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET missing');
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken<T = any>(token: string): T {
  if (!JWT_SECRET) throw new Error('JWT_SECRET missing');
  return jwt.verify(token, JWT_SECRET) as T;
}

export async function setAuthCookie(token: string) {
  try {
    const c = await cookies();
    c.set('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    // swallow errors to avoid crashing during auth cookie setting
  }
}

export async function clearAuthCookie() {
  try {
    const c = await cookies();
    c.set('auth_token', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
  } catch {
    // swallow errors
  }
}

export async function getAuthUser<T = { userId: string; email: string }>() {
  try {
    const c = await cookies();
    const token = c.get('auth_token')?.value as string | undefined;
    if (!token) return null;
    return verifyToken<T>(token);
  } catch {
    return null;
  }
}

export async function requireAuth<T = { userId: string; email: string }>() {
  const user = await getAuthUser<T>();
  if (!user) throw new Error('unauthorized');
  return user;
}