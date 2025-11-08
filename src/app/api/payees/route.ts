import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { payeeSchema } from '@/lib/schemas';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const payees = await getCollection('payees');
    const list = await payees.find({ userId }).sort({ name: 1 }).toArray();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = payeeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const payees = await getCollection('payees');
    const doc = {
      ...parsed.data,
      userId,
      createdAt: new Date().toISOString(),
    };
    const result = await payees.insertOne(doc);
    return NextResponse.json({ _id: result.insertedId, ...doc }, { status: 201 });
  } catch (e) {
    if ((e as Error).message === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('POST /payees', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}