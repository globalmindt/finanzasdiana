import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST() {
  try {
    const { userId } = await requireAuth();
    const recurrents = await getCollection('recurrents');
    const transactions = await getCollection('transactions');
    const now = new Date();
    const toRun = await recurrents.find({ userId, autoPost: true, nextRunDate: { $lte: now } }).toArray();
    let executed = 0;
    for (const r of toRun) {
      const amount = (r as any).amount;
      const type = (r as any).type; // income or expense
      const doc = {
        type,
        amount,
        userId,
        date: now,
        createdAt: new Date().toISOString(),
        notes: `Auto-post recurrent ${(r as any).name}`,
      };
      await transactions.insertOne(doc);
      executed++;
      // schedule next run (naively add one day/week/month based on frequency string)
      const freq = ((r as any).frequency || '').toLowerCase();
      const next = new Date(now);
      if (freq.includes('day')) next.setUTCDate(next.getUTCDate() + 1);
      else if (freq.includes('week')) next.setUTCDate(next.getUTCDate() + 7);
      else if (freq.includes('month')) next.setUTCMonth(next.getUTCMonth() + 1);
      await recurrents.updateOne({ _id: (r as any)._id, userId }, { $set: { nextRunDate: next } });
    }
    return NextResponse.json({ executed });
  } catch (e) {
    console.error('POST /system/recurrents/run', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}