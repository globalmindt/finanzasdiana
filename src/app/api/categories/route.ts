import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { categorySchema } from '@/lib/schemas';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { userId } = await requireAuth();
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind');
    const categories = await getCollection('categories');
    const query: any = { userId };
    if (kind) query.kind = kind;
    const list = await categories.find(query).toArray();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const categories = await getCollection('categories');
    const doc = { ...parsed.data, userId, createdAt: new Date().toISOString() };
    const result = await categories.insertOne(doc);
    return NextResponse.json({ _id: result.insertedId, ...doc }, { status: 201 });
  } catch (e) {
    if ((e as Error).message === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('POST /categories', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}