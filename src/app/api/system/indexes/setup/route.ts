import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST() {
  try {
    // require auth for safety
    await requireAuth();
    const db = await getDb();

    const results: Record<string, any> = {};

    results.users_email_unique = await db.collection('users').createIndex({ email: 1 }, { unique: true });
    results.transactions_user_date = await db.collection('transactions').createIndex({ userId: 1, date: 1 });
    results.recurrents_user_nextRun = await db.collection('recurrents').createIndex({ userId: 1, nextRunDate: 1 });
    results.accounts_user = await db.collection('accounts').createIndex({ userId: 1 });
    results.categories_user_kind = await db.collection('categories').createIndex({ userId: 1, kind: 1 });
    results.investments_user = await db.collection('investments').createIndex({ userId: 1 });
    results.inv_mov_user_inv_date = await db.collection('investment_movements').createIndex({ userId: 1, investmentId: 1, date: 1 });

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    console.error('POST /system/indexes/setup', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}