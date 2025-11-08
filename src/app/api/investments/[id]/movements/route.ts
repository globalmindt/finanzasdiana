import { NextResponse, NextRequest } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await requireAuth();
    const body = await req.json();
    const movements = await getCollection('investment_movements');
    const investments = await getCollection('investments');
    const inv = await investments.findOne({ _id: new ObjectId(id), userId });
    if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const doc = {
      investmentId: new ObjectId(id),
      userId,
      ...body,
      date: body.date ? new Date(body.date) : new Date(),
      createdAt: new Date().toISOString(),
    };
    const result = await movements.insertOne(doc);
    return NextResponse.json({ _id: result.insertedId, ...doc }, { status: 201 });
  } catch (e) {
    console.error('POST /investments/:id/movements', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}