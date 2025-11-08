import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }
    const users = await getCollection('users');
    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const doc = { email, passwordHash, createdAt: new Date().toISOString() };
    const result = await users.insertOne(doc);
    const token = signToken({ userId: result.insertedId, email });
    await setAuthCookie(token);
    return NextResponse.json({ _id: result.insertedId, email }, { status: 201 });
  } catch (e) {
    console.error('POST /auth/bootstrap', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}