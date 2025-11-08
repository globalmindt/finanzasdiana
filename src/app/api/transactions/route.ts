import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { transactionSchema } from '@/lib/schemas';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { userId } = await requireAuth();
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const type = url.searchParams.get('type');

    const transactions = await getCollection('transactions');
    const query: any = { userId };
    if (type) query.type = type;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) query.date.$lte = new Date(`${to}T23:59:59.999Z`);
    }

    const list = await transactions.find(query).sort({ date: -1 }).toArray();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const transactions = await getCollection('transactions');
    const doc: any = {
      ...parsed.data,
      userId,
      createdAt: new Date().toISOString(),
    };
    if (doc.date) doc.date = new Date(doc.date as any);
    const result = await transactions.insertOne(doc);
    return NextResponse.json({ _id: result.insertedId, ...doc }, { status: 201 });
  } catch (e) {
    if ((e as Error).message === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('POST /transactions', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}