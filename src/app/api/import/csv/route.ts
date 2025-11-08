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
    // Compact numeric formats like 'yyyymmdd' or 'ddmmyyyy'
    if (/^\d{8}$/.test(str)) {
      if (dateFormat === 'ymd') {
        const y = Number(str.slice(0, 4));
        const mo = Number(str.slice(4, 6)) - 1;
        const d = Number(str.slice(6, 8));
        return new Date(Date.UTC(y, mo, d));
      } else {
        const d = Number(str.slice(0, 2));
        const mo = Number(str.slice(2, 4)) - 1;
        const y = Number(str.slice(4, 8));
        return new Date(Date.UTC(y, mo, d));
      }
    }
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

function classify(description: string, txType?: string) {
  const text = (description || '').toLowerCase();
  const tx = (txType || '').toLowerCase();
  const rules: Array<{ includes: string[]; category: string; kind: 'income' | 'expense' }>= [
    // Ingresos comunes (nómina, subsidios)
    { includes: ['nomina', 'salary', 'payroll', 'loon', 'vebego'], category: 'Salario', kind: 'income' },
    { includes: ['belastingdienst', 'svb', 'sociale verzekeringsbank', 'toeslag', 'allowance'], category: 'Subsidios', kind: 'income' },
    // Transferencias y pagos generales
    { includes: ['transfer', 'tikkie'], category: 'Transferencias', kind: 'expense' },
    // Supermercado / comida
    { includes: ['mercadona', 'carrefour', 'jumbo', 'albert heijn', 'ah ', 'lidl', 'plus ', 'super', 'supermercado'], category: 'Supermercado', kind: 'expense' },
    { includes: ['rest', 'bar', 'cafe', 'restaurant'], category: 'Restaurantes', kind: 'expense' },
    // Suscripciones y compras online
    { includes: ['netflix', 'spotify', 'amazon prime', 'hbo', 'disney'], category: 'Suscripciones', kind: 'expense' },
    { includes: ['amazon', 'bol.com', 'coolblue', 'klarna', 'bever', 'nike', 'shein'], category: 'Compras', kind: 'expense' },
    // Terminales y pasarelas de pago frecuentes (Mollie)
    { includes: ['payment terminal', 'mollie'], category: 'Compras', kind: 'expense' },
    // Servicios y facturas
    { includes: ['vattenfall', 'stroom', 'electric'], category: 'Electricidad', kind: 'expense' },
    { includes: ['eneco', 'essent', 'warmte', ' stadsverwarming', ' gas '], category: 'Gas', kind: 'expense' },
    { includes: ['pwn', 'waterleiding', 'hoogheemraadschap', 'water'], category: 'Agua', kind: 'expense' },
    { includes: ['ziggo'], category: 'Internet', kind: 'expense' },
    { includes: ['lycamobile', 'telefonia', 'telecom'], category: 'Telefonía', kind: 'expense' },
    { includes: ['gemeente'], category: 'Impuestos municipales', kind: 'expense' },
    { includes: ['belasting'], category: 'Impuestos', kind: 'expense' },
    { includes: ['zorg', 'asr'], category: 'Salud', kind: 'expense' },
    // Educación (colegios, alquiler de equipos escolares)
    { includes: ['scholen', 'school', 'stichting scholen', 'rent company'], category: 'Educación', kind: 'expense' },
    // Transporte
    { includes: ['uber', 'cabify', 'bus', 'metro', 'tren', 'ns ', 'gvb', 'ov-chip'], category: 'Transporte', kind: 'expense' },
    // Alquiler
    { includes: ['huur', 'rent', 'pluijm'], category: 'Alquiler', kind: 'expense' },
    // Métodos de pago
    { includes: ['ideal'], category: 'Compras', kind: 'expense' },
    { includes: ['sepa'], category: 'Suscripciones', kind: 'expense' },
    // Cargos y productos bancarios (tarjeta de crédito, paquetes ING)
    { includes: ['oranjepakket', 'batch payment', 'various', 'creditcard', 'incasso ing'], category: 'Bancarios', kind: 'expense' },
  ];
  for (const r of rules) {
    if (r.includes.some(k => text.includes(k))) return r;
    // también considerar el tipo de transacción
    if (tx && r.includes.some(k => tx.includes(k))) return r;
  }
  return { category: text.includes('ingreso') ? 'Otros ingresos' : 'Otros gastos', kind: text.includes('ingreso') ? 'income' as const : 'expense' as const };
}

function getObjectVal(obj: Record<string, any>, key: string): string {
  if (!key) return '';
  if (obj[key] !== undefined) return String(obj[key]);
  const alt = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return alt ? String(obj[alt] ?? '') : '';
}

function guessKey(keys: string[], patterns: RegExp[]): string {
  for (const p of patterns) {
    const k = keys.find(k => p.test(k));
    if (k) return k;
  }
  return '';
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
    const colType = String(form.get('colType') || '');

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!accountId) return NextResponse.json({ error: 'Selecciona cuenta' }, { status: 400 });

    const text = await file.text();
    const records: any[] = parse(text, { columns: hasHeader, delimiter, skip_empty_lines: true, trim: true });
    const transactions = await getCollection('transactions');
    const categoriesCol = await getCollection('categories');
    const payeesCol = await getCollection('payees');

    let inserted = 0;
    let skipped = 0;
    let duplicatesSkipped = 0;
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

    // Si hay cabecera y el usuario dejó campos vacíos, intentar adivinar
    if (hasHeader && records.length > 0 && !Array.isArray(records[0])) {
      const keys = Object.keys(records[0]);
      const datePat = [/date/i, /datum/i, /fecha/i, /transaction\s*date/i];
      const descPat = [/description/i, /^name/i, /omschrijving/i, /counter.?party/i, /merchant/i, /narrative/i];
      const amountPat = [/amount/i, /bedrag/i, /importe/i, /eur/i, /value/i];
      const notesPat = [/notes?/i, /notifications?/i, /reference/i, /kenmerk/i, /memo/i];
      const typePat = [/debit/i, /credit/i, /transaction\s*type/i, /af\/?bij/i, /mutatie/i, /dc/i];
      if (!getObjectVal(records[0], colDate)) {
        const g = guessKey(keys, datePat); if (g) (colDate as any) = g;
      }
      if (!getObjectVal(records[0], colDesc)) {
        const g = guessKey(keys, descPat); if (g) (colDesc as any) = g;
      }
      if (!getObjectVal(records[0], colAmount)) {
        const g = guessKey(keys, amountPat); if (g) (colAmount as any) = g;
      }
      if (colNotes && !getObjectVal(records[0], colNotes)) {
        const g = guessKey(keys, notesPat); if (g) (colNotes as any) = g;
      }
      if (colType && !getObjectVal(records[0], colType)) {
        const g = guessKey(keys, typePat); if (g) (colType as any) = g;
      }
    }

    function getVal(row: any, key: string): string {
      if (Array.isArray(row)) {
        const idx = Number(key);
        if (!Number.isNaN(idx)) return String(row[idx] ?? '');
        return '';
      }
      return getObjectVal(row, key);
    }

    for (const row of records) {
      try {
        const rawAmount = String(getVal(row, colAmount) ?? '').trim();
        const rawDate = String(getVal(row, colDate) ?? '').trim();
        const description = String(getVal(row, colDesc) ?? '').trim();
        const notes = String((colNotes ? getVal(row, colNotes) : '') ?? '').trim();
        if (!rawAmount || !rawDate) { skipped++; continue; }

        const amountNum = normalizeAmount(rawAmount);
        // Clasificación preliminar por descripción y tipo de transacción (si disponible)
        let rawTypeLower = '';
        if (colType) {
          rawTypeLower = String(getVal(row, colType) ?? '').trim().toLowerCase();
        }
        const cls = classify(description, rawTypeLower);
        // Determinar tipo
        let type: 'income' | 'expense';
        if (rawTypeLower) {
          if (rawTypeLower.includes('credit')) type = 'income';
          else if (rawTypeLower.includes('debit')) type = 'expense';
          else type = amountNum < 0 ? 'expense' : cls.kind; // fallback
        } else {
          type = amountNum < 0 ? 'expense' : cls.kind;
        }
        const amount = Math.abs(amountNum);
        const date = parseDate(rawDate, dateFormat);
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
        // Deduplicación básica: mismo día, monto, tipo y coincidencia por nombre de payee o notas
        const startDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
        const endDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
        const orConds: any[] = [];
        if (description) orConds.push({ payeeName: description });
        if (notes) orConds.push({ notes });
        const dupQuery: any = {
          userId,
          accountId,
          type,
          amount,
          date: { $gte: startDay, $lt: endDay },
        };
        if (orConds.length > 0) dupQuery.$or = orConds;
        const existing = await transactions.findOne(dupQuery);
        if (existing) {
          duplicatesSkipped++;
          continue;
        }

        const insertDoc: any = { ...parsedTx.data, userId, createdAt: new Date().toISOString(), date };
        await transactions.insertOne(insertDoc);
        inserted++;
      } catch (e) {
        skipped++;
        continue;
      }
    }

    return NextResponse.json({ inserted, skipped, duplicatesSkipped, categoriesCreated, payeesCreated });
  } catch (e) {
    if ((e as Error).message === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('POST /api/import/csv', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}