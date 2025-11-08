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

async function ensureCategory(name, kind, cookie) {
  // Get existing categories of kind and find by name
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

async function main() {
  const cookie = await getCookieHeader();
  if (!cookie) throw new Error('No se encontró cookie de sesión en cookie.txt');

  const salarioCat = await ensureCategory('Salario', 'income', cookie);
  const subsidiosCat = await ensureCategory('Subsidios', 'income', cookie);
  const interesesCat = await ensureCategory('Intereses', 'income', cookie);
  const devolucionesCat = await ensureCategory('Devoluciones impuestos', 'income', cookie);
  const ayudasGobCat = await ensureCategory('Ayudas gobierno', 'income', cookie);
  const transferRecCat = await ensureCategory('Transferencias recibidas', 'income', cookie);
  const otrosIncCat = await ensureCategory('Otros ingresos', 'income', cookie);

  const txRes = await fetch('http://localhost:3000/api/transactions?type=income', {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const txs = await txRes.json();
  if (!Array.isArray(txs)) throw new Error('No se pudieron obtener transacciones');

  let updated = 0;
  for (const t of txs) {
    const name = (t.payeeName || '').toLowerCase();
    const notes = (t.notes || '').toLowerCase();
    const currentCatId = String(t.categoryId || '');
    let targetCatId = '';

    // Nómina (ING/CSV puede aparecer como "Loon", "Salaris", "Salary", "Payroll")
    if (name.includes('vebego') || name.includes('loon') || name.includes('salaris') || name.includes('salary') || name.includes('payroll')) {
      targetCatId = String(salarioCat._id || '');
    }
    // Subsidios y ayudas (SVB / Toeslagen / Belastingdienst allowances)
    else if (name.includes('sociale verzekeringsbank') || name.includes('svb') || name.includes('toeslag')) {
      targetCatId = String(subsidiosCat._id || '');
    }
    // Devoluciones de impuestos (Belastingdienst teruggave / refund)
    else if (name.includes('belastingdienst') && (name.includes('teruggave') || notes.includes('teruggave') || name.includes('refund') || notes.includes('refund'))) {
      targetCatId = String(devolucionesCat._id || '');
    }
    // Belastingdienst que no sea devolución (lo tratamos como Subsidios por defecto)
    else if (name.includes('belastingdienst') || notes.includes('belastingdienst')) {
      targetCatId = String(subsidiosCat._id || '');
    }
    // Intereses
    else if (name.includes('interest') || name.includes('rente')) {
      targetCatId = String(interesesCat._id || '');
    }
    // Fallback: si no hay mapeo y el movimiento no tiene categoría actual, asignar Otros ingresos
    else if (!currentCatId) {
      targetCatId = String(otrosIncCat._id || '');
    }
    // Transferencias recibidas (Tikkie, Transfer)
    else if (name.includes('tikkie') || name.includes('transfer')) {
      targetCatId = String(transferRecCat._id || '');
    }
    // Ayudas gobierno explícitas
    else if (name.includes('toeslagen') || name.includes('uitkering') || notes.includes('uitkering')) {
      targetCatId = String(ayudasGobCat._id || '');
    }

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

  console.log(`Reclasificados: ${updated}`);
}

main().catch(e => {
  console.error('Fallo de re-clasificación:', e);
  process.exit(1);
});