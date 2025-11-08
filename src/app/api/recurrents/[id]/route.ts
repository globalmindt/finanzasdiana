import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { recurrentSchema } from '@/lib/schemas';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = recurrentSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const recurrents = await getCollection('recurrents');
    const update: any = { ...parsed.data };
    if (update.nextRunDate) update.nextRunDate = new Date(update.nextRunDate as any);
    const result = await recurrents.updateOne({ _id: new ObjectId(params.id), userId }, { $set: update });
    return NextResponse.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (e) {
    console.error('PATCH /recurrents/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth();
    const recurrents = await getCollection('recurrents');
    const result = await recurrents.deleteOne({ _id: new ObjectId(params.id), userId });
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (e) {
    console.error('DELETE /recurrents/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}