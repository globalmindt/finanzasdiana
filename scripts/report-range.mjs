#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      out[key] = val;
    }
  }
  return out;
}

async function getCookieHeader() {
  try {
    const raw = readFileSync(resolve(process.cwd(), 'cookie.txt'), 'utf8');
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const jarLine = lines.find(l => /\sauth_token\s/.test(l));
    if (jarLine) {
      const parts = jarLine.split(/\s+/);
      const name = parts[5];
      const value = parts[6];
      if (name && value) return `${name}=${value}`;
    }
    const kv = lines.find(l => /=/.test(l) && !l.startsWith('#'));
    if (kv) return kv;
  } catch {}
  return '';
}

async function fetchJson(url, cookie) {
  const res = await fetch(url, { headers: cookie ? { Cookie: cookie } : {} });
  return await res.json();
}

function groupCount(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    const prev = map.get(k) || 0;
    map.set(k, prev + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function groupSum(arr, keyFn, valFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    const prev = map.get(k) || 0;
    const v = valFn(item) || 0;
    map.set(k, prev + v);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function normalizePayee(raw) {
  const s = String(raw || '').trim().toLowerCase();
  // Normalización básica de alias comunes
  if (!s) return '(sin payee)';
  if (s.includes('aliexpress') || s.includes('ali express') || s.includes('ali-expres') || s.includes('alexpres') || s.includes('ali expres')) return 'AliExpress';
  if (s.includes('openai')) return 'OpenAI';
  if (s.includes('cursor')) return 'Cursor';
  if (s.includes('globalboletos')) return 'Globalboletos LLC';
  if (s.includes('revpoints') || s.includes('afronden')) return 'RevPoints Afronden';
  if (s.includes('overschrijving naar revolut-gebruiker')) return 'Overschrijving a usuario Revolut';
  return s
    .split(/\s+/)
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function fmtEUR(n) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  } catch {
    return `${n.toFixed(2)} EUR`;
  }
}

async function main() {
  const opts = parseArgs();
  const from = String(opts.from || '').trim();
  const to = String(opts.to || '').trim();
  const accountId = String(opts.account || '').trim();
  if (!from || !to) {
    console.error('Uso: node scripts/report-range.mjs --from yyyy-mm-dd --to yyyy-mm-dd [--account <id>]');
    process.exit(1);
  }

  const cookie = await getCookieHeader();
  if (!cookie) {
    console.error('No se encontró cookie de sesión en cookie.txt');
    process.exit(1);
  }

  const txUrl = `http://localhost:3000/api/transactions?from=${from}&to=${to}`;
  let list = await fetchJson(txUrl, cookie);
  if (!Array.isArray(list)) {
    console.error('No se pudieron obtener transacciones');
    process.exit(1);
  }
  if (accountId) list = list.filter(t => String(t.accountId) === accountId);

  const cats = await fetchJson('http://localhost:3000/api/categories', cookie);
  const catById = new Map();
  if (Array.isArray(cats)) {
    for (const c of cats) {
      catById.set(String(c._id), c);
    }
  }

  const total = list.length;
  const incomes = list.filter(t => t.type === 'income');
  const expenses = list.filter(t => t.type === 'expense');
  const uncategorized = list.filter(t => !t.categoryId);
  const catDist = groupCount(list, t => (t.categoryId && catById.get(String(t.categoryId)) ? catById.get(String(t.categoryId)).name : '(Sin categoría)'));
  const payeeDist = groupCount(list, t => normalizePayee(t.payeeName || '(Sin payee)'));
  const payeeSumExpenses = groupSum(expenses, t => normalizePayee(t.payeeName || '(Sin payee)'), t => Math.abs(Number(t.amount) || 0));
  const catSumExpenses = groupSum(expenses, t => (t.categoryId && catById.get(String(t.categoryId)) ? catById.get(String(t.categoryId)).name : '(Sin categoría)'), t => Math.abs(Number(t.amount) || 0));

  const totalIncomeAmt = incomes.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalExpenseAmt = expenses.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const otrosGastosId = Array.isArray(cats) ? cats.find(c => c.name.toLowerCase() === 'otros gastos')?._id : undefined;
  const otrosIngresosId = Array.isArray(cats) ? cats.find(c => c.name.toLowerCase() === 'otros ingresos')?._id : undefined;
  const otrosGastosCount = otrosGastosId ? list.filter(t => String(t.categoryId) === String(otrosGastosId)).length : 0;
  const otrosIngresosCount = otrosIngresosId ? list.filter(t => String(t.categoryId) === String(otrosIngresosId)).length : 0;

  console.log('Reporte de clasificación:');
  console.log(`- Rango: ${from} a ${to}`);
  console.log(`- Cuenta: ${accountId || '(todas)'}`);
  console.log(`- Total: ${total} | Ingresos: ${incomes.length} | Gastos: ${expenses.length} | Sin categoría: ${uncategorized.length}`);
  console.log(`- Total ingresos: ${fmtEUR(totalIncomeAmt)} | Total gastos: ${fmtEUR(totalExpenseAmt)} | Balance: ${fmtEUR(totalIncomeAmt - totalExpenseAmt)}`);
  console.log(`- "Otros gastos": ${otrosGastosCount} | "Otros ingresos": ${otrosIngresosCount}`);
  console.log('- Top 10 categorías:');
  for (const [name, count] of catDist.slice(0, 10)) {
    console.log(`  • ${name}: ${count}`);
  }
  console.log('- Top 10 payees por número de movimientos:');
  for (const [name, count] of payeeDist.slice(0, 10)) {
    console.log(`  • ${name}: ${count}`);
  }
  console.log('- Top 10 payees por importe (gastos):');
  for (const [name, sum] of payeeSumExpenses.slice(0, 10)) {
    console.log(`  • ${name}: ${fmtEUR(sum)}`);
  }
  console.log('- Top 10 categorías por importe (gastos):');
  for (const [name, sum] of catSumExpenses.slice(0, 10)) {
    console.log(`  • ${name}: ${fmtEUR(sum)}`);
  }
}

main().catch(e => {
  console.error('Fallo reporte:', e);
  process.exit(1);
});