import { NextResponse, NextRequest } from 'next/server';
import { getCollection } from '@/lib/db';
import { payeeSchema } from '@/lib/schemas';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = payeeSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const payees = await getCollection('payees');
    const result = await payees.updateOne({ _id: new ObjectId(id), userId }, { $set: parsed.data });
    return NextResponse.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (e) {
    console.error('PATCH /payees/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await requireAuth();
    const payees = await getCollection('payees');
    const result = await payees.deleteOne({ _id: new ObjectId(id), userId });
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (e) {
    console.error('DELETE /payees/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}