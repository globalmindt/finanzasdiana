import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { recurrentSchema } from '@/lib/schemas';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const recurrents = await getCollection('recurrents');
    const list = await recurrents.find({ userId }).sort({ nextRunDate: 1 }).toArray();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = recurrentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const recurrents = await getCollection('recurrents');
    const doc = {
      ...parsed.data,
      userId,
      nextRunDate: new Date(parsed.data.nextRunDate as any),
      createdAt: new Date().toISOString(),
    };
    const result = await recurrents.insertOne(doc);
    return NextResponse.json({ _id: result.insertedId, ...doc }, { status: 201 });
  } catch (e) {
    if ((e as Error).message === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('POST /recurrents', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}