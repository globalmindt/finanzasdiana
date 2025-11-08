import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { accountSchema } from '@/lib/schemas';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const accounts = await getCollection('accounts');
    const list = await accounts.find({ userId }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = accountSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const accounts = await getCollection('accounts');
    const doc = { ...parsed.data, userId, createdAt: new Date().toISOString() };
    const result = await accounts.insertOne(doc);
    return NextResponse.json({ _id: result.insertedId, ...doc }, { status: 201 });
  } catch (e) {
    if ((e as Error).message === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('POST /accounts', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}