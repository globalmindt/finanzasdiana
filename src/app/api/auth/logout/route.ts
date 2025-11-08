import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  try {
    clearAuthCookie();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /auth/logout', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}