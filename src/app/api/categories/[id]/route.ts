import { NextResponse, NextRequest } from 'next/server';
import { getCollection } from '@/lib/db';
import { categorySchema } from '@/lib/schemas';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = categorySchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const categories = await getCollection('categories');
    const result = await categories.updateOne({ _id: new ObjectId(id), userId }, { $set: parsed.data });
    return NextResponse.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (e) {
    console.error('PATCH /categories/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await requireAuth();
    const categories = await getCollection('categories');
    const result = await categories.deleteOne({ _id: new ObjectId(id), userId });
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (e) {
    console.error('DELETE /categories/:id', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}