import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseDate(str) {
  // Expecting yyyymmdd
  if (/^\d{8}$/.test(str)) {
    const y = Number(str.slice(0, 4));
    const mo = Number(str.slice(4, 6)) - 1;
    const d = Number(str.slice(6, 8));
    const dt = new Date(Date.UTC(y, mo, d));
    const iso = `${y.toString().padStart(4, '0')}-${(mo+1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    return { date: dt, ymd: iso };
  }
  // Fallback
  const dt = new Date(str);
  const iso = dt.toISOString().slice(0, 10);
  return { date: dt, ymd: iso };
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

function parseCsvDoc(filePath) {
  const raw = readFileSync(resolve(process.cwd(), filePath), 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines[0];
  const rows = lines.slice(1);
  // Columns: "Date","Name / Description","Account","Counterparty","Code","Debit/credit","Amount (EUR)","Transaction type","Notifications"
  const idxDate = 0;
  const dates = [];
  for (const line of rows) {
    const m = line.match(/^"(.*?)",/);
    if (!m) continue;
    const { ymd } = parseDate(m[1]);
    dates.push(ymd);
  }
  dates.sort();
  const from = dates[0];
  const to = dates[dates.length - 1];
  return { count: rows.length, from, to };
}

async function main() {
  const cookie = await getCookieHeader();
  if (!cookie) throw new Error('No se encontró cookie de sesión en cookie.txt');
  const { count: csvCount, from, to } = parseCsvDoc('Document van Arturo');
  const res = await fetch(`http://localhost:3000/api/transactions?from=${from}&to=${to}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error('No se pudieron obtener transacciones');
  const dbCount = list.length;
  const incCount = list.filter(t => t.type === 'income').length;
  const expCount = list.filter(t => t.type === 'expense').length;
  const missingCat = list.filter(t => !t.categoryId).length;
  console.log(`Verificación importación:`);
  console.log(`- CSV movimientos: ${csvCount}`);
  console.log(`- BD movimientos en rango (${from} a ${to}): ${dbCount} (ingresos: ${incCount}, gastos: ${expCount})`);
  console.log(`- Sin categoría en BD (rango): ${missingCat}`);
  if (dbCount >= csvCount) {
    console.log('OK: La BD contiene al menos tantos movimientos como el CSV para el rango. (Deduplicación puede reducir inserciones si hay duplicados)');
  } else {
    console.log('ATENCIÓN: La BD tiene menos movimientos que el CSV en el rango. Podría haber filas no importadas por formato o faltas de datos.');
  }
}

main().catch(e => {
  console.error('Fallo verificación:', e);
  process.exit(1);
});