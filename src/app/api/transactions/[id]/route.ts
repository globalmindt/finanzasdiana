import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { transactionSchema } from '@/lib/schemas';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = transactionSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const transactions = await getCollection('transactions');
    const update: any = { ...parsed.data };
    if (update.date) update.date = new Date(update.date as any);
    const result = await transactions.updateOne({ _id: new ObjectId(params.id), userId }, { $set: update });
    return NextResponse.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (e) {
    console.error('PATCH /transactions/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth();
    const transactions = await getCollection('transactions');
    const result = await transactions.deleteOne({ _id: new ObjectId(params.id), userId });
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (e) {
    console.error('DELETE /transactions/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}