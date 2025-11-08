#!/usr/bin/env node
// CLI para importar un CSV usando el endpoint /api/import/csv
// Uso:
//   node scripts/import-csv.mjs --file "./Document van Arturo" [--account <id>] [--preset ing-nl]
//   [--delimiter ,] [--date-format ymd] [--has-header true] [--col-date "Date"] [--col-desc "Description"] [--col-amount "Amount"] [--col-notes "Notes"] [--col-type "Debit/credit"]

import { readFileSync } from 'fs';
import { resolve } from 'path';

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

function applyPreset(opts) {
  const preset = opts.preset || 'ing-nl';
  if (preset === 'ing-nl') {
    opts.delimiter = opts.delimiter ?? ',';
    opts.dateFormat = opts.dateFormat ?? 'ymd';
    opts.hasHeader = opts.hasHeader ?? 'true';
    opts.colDate = opts.colDate ?? 'Date';
    opts.colDesc = opts.colDesc ?? 'Name / Description';
    opts.colAmount = opts.colAmount ?? 'Amount (EUR)';
    opts.colNotes = opts.colNotes ?? 'Notifications';
    opts.colType = opts.colType ?? 'Debit/credit';
  } else if (preset === 'revolut') {
    opts.delimiter = opts.delimiter ?? ',';
    opts.dateFormat = opts.dateFormat ?? 'ymd';
    opts.hasHeader = opts.hasHeader ?? 'true';
    opts.colDate = opts.colDate ?? 'Date';
    opts.colDesc = opts.colDesc ?? 'Description';
    opts.colAmount = opts.colAmount ?? 'Amount';
    opts.colNotes = opts.colNotes ?? 'Notes';
    opts.colType = opts.colType ?? 'Type';
  } else if (preset === 'abn-amro') {
    opts.delimiter = opts.delimiter ?? ';';
    opts.dateFormat = opts.dateFormat ?? 'dmy';
    opts.hasHeader = opts.hasHeader ?? 'true';
    opts.colDate = opts.colDate ?? 'Datum';
    opts.colDesc = opts.colDesc ?? 'Omschrijving';
    opts.colAmount = opts.colAmount ?? 'Bedrag (EUR)';
    opts.colNotes = opts.colNotes ?? 'Toelichting';
    opts.colType = opts.colType ?? 'Mutatie';
  } else if (preset === 'rabobank') {
    opts.delimiter = opts.delimiter ?? ',';
    opts.dateFormat = opts.dateFormat ?? 'dmy';
    opts.hasHeader = opts.hasHeader ?? 'true';
    opts.colDate = opts.colDate ?? 'Datum';
    opts.colDesc = opts.colDesc ?? 'Naam/Omschrijving';
    opts.colAmount = opts.colAmount ?? 'Bedrag';
    opts.colNotes = opts.colNotes ?? 'Mededelingen';
    opts.colType = opts.colType ?? 'Af/Bij';
  }
}

async function main() {
  const opts = parseArgs();
  if (!opts.file) {
    console.error('Error: debes indicar --file <ruta CSV>');
    process.exit(1);
  }
  applyPreset(opts);

  const filePath = resolve(process.cwd(), String(opts.file));
  const buf = readFileSync(filePath);

  // Leer cookie de sesión para autenticación (usa cookie.txt en raíz)
  let cookieHeader = '';
  try {
    const raw = readFileSync(resolve(process.cwd(), 'cookie.txt'), 'utf8');
    // Intentar parsear formato Netscape cookie jar (curl)
    // Campos: domain, flag, path, secure, expiration, name, value
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const jarLine = lines.find(l => /\sauth_token\s/.test(l));
    if (jarLine) {
      const parts = jarLine.split(/\s+/);
      const name = parts[5];
      const value = parts[6];
      if (name && value) cookieHeader = `${name}=${value}`;
    } else {
      // Si no es formato Netscape, usar el contenido tal cual si parece "key=value"
      const kv = lines.find(l => /=/.test(l) && !l.startsWith('#'));
      if (kv) cookieHeader = kv;
    }
  } catch {}

  // Si no se proporciona account, intenta obtener la primera cuenta del usuario
  let accountId = opts.account || '';
  if (!accountId) {
    try {
      const resAcc = await fetch('http://localhost:3000/api/accounts', {
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
      });
      const accs = await resAcc.json();
      if (Array.isArray(accs) && accs.length > 0) {
        accountId = String(accs[0]._id);
        console.log(`Usando cuenta destino: ${accs[0].name} (${accountId})`);
      } else {
        console.error('No hay cuentas disponibles. Crea una cuenta primero.');
        process.exit(1);
      }
    } catch (e) {
      console.error('No se pudo obtener cuentas. Proporciona --account <id>.');
      process.exit(1);
    }
  }

  // Construir FormData
  const fd = new FormData();
  const blob = new Blob([buf], { type: 'text/csv' });
  fd.append('file', blob, filePath.split('/').pop());
  fd.append('accountId', accountId);
  fd.append('delimiter', String(opts.delimiter || ','));
  fd.append('dateFormat', String(opts.dateFormat || 'ymd'));
  fd.append('hasHeader', String(opts.hasHeader ?? 'true'));
  if (opts.colDate) fd.append('colDate', String(opts.colDate));
  if (opts.colDesc) fd.append('colDesc', String(opts.colDesc));
  if (opts.colAmount) fd.append('colAmount', String(opts.colAmount));
  if (opts.colNotes) fd.append('colNotes', String(opts.colNotes));
  if (opts.colType) fd.append('colType', String(opts.colType));

  const res = await fetch('http://localhost:3000/api/import/csv', {
    method: 'POST',
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Error al importar:', data);
    process.exit(1);
  }
  console.log(`Importados: ${data.inserted}`);
  console.log(`Omitidos: ${data.skipped}`);
  if (data.duplicatesSkipped !== undefined) console.log(`Duplicados omitidos: ${data.duplicatesSkipped}`);
  console.log(`Payees creados: ${data.payeesCreated}`);
  console.log(`Categorías creadas: ${data.categoriesCreated}`);
}

main().catch((e) => {
  console.error('Fallo del script:', e);
  process.exit(1);
});