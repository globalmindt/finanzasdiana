import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function GET() {
  const env = {
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    MONGODB_DB: Boolean(process.env.MONGODB_DB),
    JWT_SECRET: Boolean(process.env.JWT_SECRET),
  };

  const status: any = { env };

  // Check DB connectivity
  try {
    const db = await getDb();
    const admin = await db.admin().ping();
    status.db = { ok: true, ping: admin?.ok === 1 };
  } catch (e) {
    status.db = { ok: false, error: (e as Error).message };
  }

  // Check JWT signing
  try {
    const token = signToken({ _test: true }, 60);
    status.jwt = { ok: Boolean(token) };
  } catch (e) {
    status.jwt = { ok: false, error: (e as Error).message };
  }

  return NextResponse.json(status);
}