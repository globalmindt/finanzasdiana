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

async function listCategories(kind, cookie) {
  const res = await fetch(`http://localhost:3000/api/categories?kind=${kind}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  return await res.json();
}

async function ensureCategory(name, kind, cookie) {
  const list = await listCategories(kind, cookie);
  const found = Array.isArray(list) ? list.find(c => (c.name || '').toLowerCase() === name.toLowerCase()) : null;
  if (found) return null; // already exists
  const create = await fetch('http://localhost:3000/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ name, kind }),
  });
  if (!create.ok) throw new Error(`No se pudo crear categoría ${name}`);
  return await create.json();
}

async function main() {
  const cookie = await getCookieHeader();
  if (!cookie) throw new Error('No se encontró cookie de sesión en cookie.txt');

  const income = [
    'Salario',
    'Subsidios',
    'Ayudas gobierno',
    'Transferencias recibidas',
    'Intereses',
    'Reembolsos',
    'Devoluciones impuestos',
    'Otros ingresos',
  ];

  const expense = [
    'Alquiler',
    'Electricidad',
    'Gas',
    'Agua',
    'Internet',
    'Telefonía',
    'Impuestos municipales',
    'Impuestos',
    'Supermercado',
    'Restaurantes',
    'Transporte',
    'Salud',
    'Educación',
    'Suscripciones',
    'Compras',
    'Bancarios',
    'Hogar',
    'Entretenimiento',
    'Donaciones',
    'Otros gastos',
  ];

  let created = 0;
  for (const name of income) {
    const r = await ensureCategory(name, 'income', cookie);
    if (r) created++;
  }
  for (const name of expense) {
    const r = await ensureCategory(name, 'expense', cookie);
    if (r) created++;
  }

  console.log(`Categorías creadas: ${created}`);
}

main().catch(e => {
  console.error('Fallo al sembrar categorías:', e);
  process.exit(1);
});