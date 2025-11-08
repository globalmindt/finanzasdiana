import { NextResponse, NextRequest } from 'next/server';
import { getCollection } from '@/lib/db';
import { accountSchema } from '@/lib/schemas';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = accountSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const accounts = await getCollection('accounts');
    const result = await accounts.updateOne({ _id: new ObjectId(id), userId }, { $set: parsed.data });
    return NextResponse.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (e) {
    console.error('PATCH /accounts/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await requireAuth();
    const accounts = await getCollection('accounts');
    const result = await accounts.deleteOne({ _id: new ObjectId(id), userId });
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (e) {
    console.error('DELETE /accounts/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}