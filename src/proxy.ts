import { NextResponse, NextRequest } from 'next/server';

function isTokenValid(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payloadJson = JSON.parse(atob(parts[1]));
    if (!payloadJson || typeof payloadJson.exp !== 'number') return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return payloadJson.exp > nowSec;
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const isApi = pathname.startsWith('/api');
  const isStatic = pathname.startsWith('/_next') || pathname === '/favicon.ico';

  if (isApi || isStatic) return NextResponse.next();

  const isLogin = pathname === '/login';
  const hasValidAuth = isTokenValid(req);

  // If authenticated and visiting login, redirect to home
  if (isLogin && hasValidAuth) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // If not authenticated and visiting any protected page, redirect to login with returnTo
  if (!hasValidAuth && !isLogin) {
    const returnTo = encodeURIComponent(pathname + (url.search ? url.search : ''));
    return NextResponse.redirect(new URL(`/login?returnTo=${returnTo}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)',
  ],
};