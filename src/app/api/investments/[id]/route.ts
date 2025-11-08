import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const investments = await getCollection('investments');
    const update: any = { ...body };
    if (update.lastUpdate) update.lastUpdate = new Date(update.lastUpdate as any);
    const result = await investments.updateOne({ _id: new ObjectId(params.id), userId }, { $set: update });
    return NextResponse.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (e) {
    console.error('PATCH /investments/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // movements sub-route will be separate; keeping PATCH/DELETE here
  return NextResponse.json({ error: 'Use /investments/:id/movements' }, { status: 400 });
}