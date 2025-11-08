import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

async function fetchAll(type, cookie) {
  const url = type ? `http://localhost:3000/api/transactions?type=${type}` : 'http://localhost:3000/api/transactions';
  const res = await fetch(url, { headers: cookie ? { Cookie: cookie } : {} });
  return await res.json();
}

async function main() {
  const cookie = await getCookieHeader();
  if (!cookie) throw new Error('No se encontró cookie de sesión en cookie.txt');

  const incomes = await fetchAll('income', cookie);
  const expenses = await fetchAll('expense', cookie);

  const incMissing = Array.isArray(incomes) ? incomes.filter(t => !t.categoryId) : [];
  const expMissing = Array.isArray(expenses) ? expenses.filter(t => !t.categoryId) : [];

  const summary = {
    ingresosTotal: Array.isArray(incomes) ? incomes.length : 0,
    ingresosSinCategoria: incMissing.length,
    gastosTotal: Array.isArray(expenses) ? expenses.length : 0,
    gastosSinCategoria: expMissing.length,
  };

  console.log('Auditoría de categorías:', JSON.stringify(summary, null, 2));
  if (incMissing.length > 0) {
    console.log('Ingresos sin categoría (detalle):');
    for (const t of incMissing) {
      console.log(`- Fecha: ${t.date} | Importe: ${t.amount} | Payee: ${t.payeeName || ''} | Notas: ${t.notes || ''} | id: ${t._id}`);
    }
  }
  if (expMissing.length > 0) {
    console.log('Gastos sin categoría (detalle):');
    for (const t of expMissing) {
      console.log(`- Fecha: ${t.date} | Importe: ${t.amount} | Payee: ${t.payeeName || ''} | Notas: ${t.notes || ''} | id: ${t._id}`);
    }
  }
}

main().catch(e => {
  console.error('Fallo auditoría:', e);
  process.exit(1);
});