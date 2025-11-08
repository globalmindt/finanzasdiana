import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function normalize(str) {
  return (str || '').toLowerCase();
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

async function ensureCategory(name, kind, cookie) {
  const res = await fetch(`http://localhost:3000/api/categories?kind=${kind}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const list = await res.json();
  const found = Array.isArray(list) ? list.find(c => (c.name || '').toLowerCase() === name.toLowerCase()) : null;
  if (found) return found;
  const create = await fetch('http://localhost:3000/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ name, kind }),
  });
  return await create.json();
}

function mapCategory(payeeName, notes) {
  const t = normalize(payeeName) + ' ' + normalize(notes);
  if (t.includes('b pluijm')) return { name: 'Alquiler', kind: 'expense' };
  if (t.includes('vattenfall')) return { name: 'Electricidad', kind: 'expense' };
  if (t.includes('eneco') || t.includes('essent') || t.includes('warmte') || t.includes('stadsverwarming') || t.includes(' gas ')) return { name: 'Gas', kind: 'expense' };
  if (t.includes('ziggo')) return { name: 'Internet', kind: 'expense' };
  if (t.includes('lycamobile')) return { name: 'Telefonía', kind: 'expense' };
  if (t.includes('gemeente')) return { name: 'Impuestos municipales', kind: 'expense' };
  if (t.includes('hoogheemraadschap') || t.includes('pwn') || t.includes('waterleiding')) return { name: 'Agua', kind: 'expense' };
  if (t.includes('netflix')) return { name: 'Suscripciones', kind: 'expense' };
  if (t.includes('amazon') || t.includes('bol.com') || t.includes('coolblue') || t.includes('klarna') || t.includes('bever') || t.includes('nike') || t.includes('shein') || t.includes('payment terminal') || t.includes('mollie')) return { name: 'Compras', kind: 'expense' };
  if (t.includes('jumbo') || t.includes('albert heijn') || t.includes(' ah ') || t.includes('lidl') || t.includes('plus ')) return { name: 'Supermercado', kind: 'expense' };
  if (t.includes('uber') || t.includes('ns ') || t.includes('gvb') || t.includes('ov-chip')) return { name: 'Transporte', kind: 'expense' };
  if (t.includes('asr') || t.includes('zorg')) return { name: 'Salud', kind: 'expense' };
  if (t.includes('rent company') || t.includes('scholen') || t.includes('school') || t.includes('stichting scholen')) return { name: 'Educación', kind: 'expense' };
  if (t.includes('kosten oranjepakket') || t.includes('batch payment') || t.includes('various') || t.includes('creditcard') || t.includes('incasso ing')) return { name: 'Bancarios', kind: 'expense' };
  if (t.includes('ideal')) return { name: 'Compras', kind: 'expense' };
  if (t.includes('sepa')) return { name: 'Suscripciones', kind: 'expense' };
  return null;
}

async function main() {
  const cookie = await getCookieHeader();
  if (!cookie) throw new Error('No se encontró cookie de sesión en cookie.txt');

  const res = await fetch('http://localhost:3000/api/transactions?type=expense', {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const txs = await res.json();
  if (!Array.isArray(txs)) throw new Error('No se pudieron obtener transacciones');

  let updated = 0;
  const cacheCats = new Map();
  for (const t of txs) {
    const mapped = mapCategory(t.payeeName || '', t.notes || '');
    if (!mapped) continue;
    const key = `${mapped.kind}:${mapped.name}`;
    let cat = cacheCats.get(key);
    if (!cat) {
      cat = await ensureCategory(mapped.name, mapped.kind, cookie);
      cacheCats.set(key, cat);
    }
    const targetCatId = String(cat?._id || '');
    const currentCatId = String(t.categoryId || '');
    if (targetCatId && targetCatId !== currentCatId && t._id) {
      const r = await fetch(`http://localhost:3000/api/transactions/${t._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({ categoryId: targetCatId }),
      });
      const js = await r.json();
      if (js.modified === 1 || js.matched === 1) updated++;
    }
  }

  console.log(`Gastos reclasificados: ${updated}`);
}

main().catch(e => {
  console.error('Fallo de re-clasificación de gastos:', e);
  process.exit(1);
});