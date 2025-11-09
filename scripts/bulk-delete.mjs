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

async function del(id, cookie) {
  const res = await fetch(`http://localhost:3000/api/transactions/${id}`, {
    method: 'DELETE',
    headers: cookie ? { Cookie: cookie } : {},
  });
  const js = await res.json();
  return js.deleted || 0;
}

async function main() {
  const opts = parseArgs();
  const from = String(opts.from || '').trim();
  const to = String(opts.to || '').trim();
  const accountId = String(opts.account || '').trim();
  if (!from || !to || !accountId) {
    console.error('Uso: node scripts/bulk-delete.mjs --from yyyy-mm-dd --to yyyy-mm-dd --account <id>');
    process.exit(1);
  }
  const cookie = await getCookieHeader();
  if (!cookie) {
    console.error('No se encontró cookie de sesión en cookie.txt');
    process.exit(1);
  }
  const list = await fetchJson(`http://localhost:3000/api/transactions?from=${from}&to=${to}`, cookie);
  if (!Array.isArray(list)) {
    console.error('No se pudieron obtener transacciones');
    process.exit(1);
  }
  const target = list.filter(t => String(t.accountId) === accountId);
  let deleted = 0;
  for (const t of target) {
    if (!t._id) continue;
    deleted += await del(t._id, cookie);
  }
  console.log(`Eliminadas: ${deleted} de ${target.length} en cuenta ${accountId} y rango ${from} a ${to}`);
}

main().catch(e => {
  console.error('Fallo bulk delete:', e);
  process.exit(1);
});