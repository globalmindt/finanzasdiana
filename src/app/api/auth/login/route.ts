import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { userLoginSchema } from '@/lib/schemas';
import { comparePassword, signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = userLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const users = await getCollection('users');
    const user = await users.findOne({ email: parsed.data.email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await comparePassword(parsed.data.password, (user as any).passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ userId: (user as any)._id, email: (user as any).email });
    await setAuthCookie(token);
    return NextResponse.json({ token });
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}