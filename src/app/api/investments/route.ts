import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { investmentSchema } from '@/lib/schemas';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const investments = await getCollection('investments');
    const list = await investments.find({ userId }).sort({ lastUpdate: -1 }).toArray();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = investmentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const investments = await getCollection('investments');
    const doc = {
      ...parsed.data,
      userId,
      lastUpdate: parsed.data.lastUpdate ? new Date(parsed.data.lastUpdate as any) : new Date(),
      createdAt: new Date().toISOString(),
    };
    const result = await investments.insertOne(doc);
    return NextResponse.json({ _id: result.insertedId, ...doc }, { status: 201 });
  } catch (e) {
    if ((e as Error).message === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('POST /investments', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}