import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ authed: false }, { status: 200 });
  return NextResponse.json({ authed: true, user });
}