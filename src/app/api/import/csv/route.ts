import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { getCollection } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { transactionSchema, categorySchema, payeeSchema } from '@/lib/schemas';

function normalizeAmount(raw: string): number {
  // Replace thousand separators and unify decimal comma/dot
  const cleaned = raw.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(/,(?=\d{1,2}$)/, '.');
  const num = Number(cleaned);
  if (Number.isNaN(num)) return 0;
  return num;
}

function parseDate(str: string, dateFormat: 'dmy' | 'ymd') {
  // Accept 'dd/mm/yyyy' or 'yyyy-mm-dd' (optionally with time)
  try {
    if (dateFormat === 'dmy') {
      const m = str.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:[ T](.*))?$/);
      if (m) {
        const d = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const y = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
        return new Date(Date.UTC(y, mo, d));
      }
    } else {
      const m = str.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T](.*))?$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        return new Date(Date.UTC(y, mo, d));
      }
    }
    // Fallback
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) return d;
    return new Date();
  } catch {
    return new Date();
  }
}

function classify(description: string) {
  const text = (description || '').toLowerCase();
  const rules: Array<{ includes: string[]; category: string; kind: 'income' | 'expense' }>= [
    { includes: ['nomina', 'salary', 'payroll'], category: 'Salario', kind: 'income' },
    { includes: ['transfer'], category: 'Transferencias', kind: 'expense' },
    { includes: ['mercadona', 'carrefour', 'super', 'supermercado'], category: 'Supermercado', kind: 'expense' },
    { includes: ['netflix', 'spotify', 'amazon prime', 'hbo', 'disney'], category: 'Suscripciones', kind: 'expense' },
    { includes: ['luz', 'electric', 'agua', 'gas', 'internet', 'fibra'], category: 'Servicios', kind: 'expense' },
    { includes: ['uber', 'cabify', 'bus', 'metro', 'tren'], category: 'Transporte', kind: 'expense' },
    { includes: ['rest', 'bar', 'cafe', 'restaurant'], category: 'Restaurantes', kind: 'expense' },
  ];
  for (const r of rules) {
    if (r.includes.some(k => text.includes(k))) return r;
  }
  return { category: text.includes('ingreso') ? 'Otros ingresos' : 'Otros gastos', kind: text.includes('ingreso') ? 'income' as const : 'expense' as const };
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth();
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const accountId = String(form.get('accountId') || '');
    const delimiter = String(form.get('delimiter') || ';');
    const dateFormat = (String(form.get('dateFormat') || 'dmy') as 'dmy' | 'ymd');
    const hasHeader = String(form.get('hasHeader') || 'true') === 'true';
    const colDate = String(form.get('colDate') || 'date');
    const colDesc = String(form.get('colDesc') || 'description');
    const colAmount = String(form.get('colAmount') || 'amount');
    const colNotes = String(form.get('colNotes') || 'notes');

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!accountId) return NextResponse.json({ error: 'Selecciona cuenta' }, { status: 400 });

    const text = await file.text();
    const records: any[] = parse(text, { columns: hasHeader, delimiter, skip_empty_lines: true, trim: true });
    const transactions = await getCollection('transactions');
    const categoriesCol = await getCollection('categories');
    const payeesCol = await getCollection('payees');

    let inserted = 0;
    let skipped = 0;
    let categoriesCreated = 0;
    let payeesCreated = 0;

    async function ensureCategory(name: string, kind: 'income' | 'expense') {
      const existing = await categoriesCol.findOne({ userId, name, kind });
      if (existing) return existing;
      const parsed = categorySchema.safeParse({ name, kind });
      if (!parsed.success) return null;
      const result = await categoriesCol.insertOne({ ...parsed.data, userId });
      categoriesCreated++;
      return { _id: result.insertedId, ...parsed.data, userId } as any;
    }

    async function findOrCreatePayee(name: string, kind: 'income' | 'expense', defaultCategoryId?: string) {
      const existing = await payeesCol.findOne({ userId, name });
      if (existing) return existing;
      const parsed = payeeSchema.safeParse({ name, type: kind, defaultCategoryId });
      if (!parsed.success) return null;
      const result = await payeesCol.insertOne({ ...parsed.data, userId });
      payeesCreated++;
      return { _id: result.insertedId, ...parsed.data, userId } as any;
    }

    for (const row of records) {
      try {
        const rawAmount = String(row[colAmount] ?? '').trim();
        const rawDate = String(row[colDate] ?? '').trim();
        const description = String(row[colDesc] ?? '').trim();
        const notes = String(row[colNotes] ?? '').trim();
        if (!rawAmount || !rawDate) { skipped++; continue; }

        const amountNum = normalizeAmount(rawAmount);
        const type = amountNum < 0 ? 'expense' : 'income';
        const amount = Math.abs(amountNum);
        const date = parseDate(rawDate, dateFormat);

        // Clasificación por descripción
        const cls = classify(description);
        const cat = await ensureCategory(cls.category, type);
        const payee = await findOrCreatePayee(description || cls.category, type, cat?._id ? String(cat._id) : undefined);

        const doc: any = {
          date: date.toISOString(),
          type,
          amount,
          accountId,
          categoryId: cat?._id ? String(cat._id) : undefined,
          payeeId: payee?._id ? String(payee._id) : undefined,
          payeeName: description || undefined,
          notes: notes || undefined,
        };
        const parsedTx = transactionSchema.safeParse(doc);
        if (!parsedTx.success) { skipped++; continue; }
        const insertDoc: any = { ...parsedTx.data, userId, createdAt: new Date().toISOString(), date };
        await transactions.insertOne(insertDoc);
        inserted++;
      } catch (e) {
        skipped++;
        continue;
      }
    }

    return NextResponse.json({ inserted, skipped, categoriesCreated, payeesCreated });
  } catch (e) {
    if ((e as Error).message === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('POST /api/import/csv', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}