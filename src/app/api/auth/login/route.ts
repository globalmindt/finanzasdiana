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

    const passHash = (user as any).passwordHash;
    if (!passHash || typeof passHash !== 'string') {
      // Usuario con esquema antiguo u objeto incompleto; tratar como credenciales inválidas
      console.warn('Login: user without passwordHash field', { email: (user as any).email });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const ok = await comparePassword(parsed.data.password, passHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ userId: (user as any)._id, email: (user as any).email });
    await setAuthCookie(token);
    return NextResponse.json({ token });
  } catch (err) {
    console.error('login error', (err as Error).message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}