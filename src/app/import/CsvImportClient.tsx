"use client";
import { useState } from 'react';

type Account = { _id: string; name: string };

export default function CsvImportClient({ accounts }: { accounts: Account[] }) {
  const [accountId, setAccountId] = useState<string>('');
  const [preset, setPreset] = useState<string>('custom');
  const [delimiter, setDelimiter] = useState<string>(';');
  const [dateFormat, setDateFormat] = useState<'dmy' | 'ymd'>('dmy');
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [colDate, setColDate] = useState<string>('date');
  const [colDesc, setColDesc] = useState<string>('description');
  const [colAmount, setColAmount] = useState<string>('amount');
  const [colNotes, setColNotes] = useState<string>('notes');
  const [colType, setColType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const fileInput = (e.currentTarget.elements.namedItem('file') as HTMLInputElement);
    const file = fileInput?.files?.[0];
    if (!file) {
      setError('Selecciona un archivo CSV');
      setLoading(false);
      return;
    }
    if (!accountId) {
      setError('Selecciona la cuenta destino');
      setLoading(false);
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('accountId', accountId);
    fd.append('delimiter', delimiter);
    fd.append('dateFormat', dateFormat);
    fd.append('hasHeader', String(hasHeader));
    fd.append('colDate', colDate);
    fd.append('colDesc', colDesc);
    fd.append('colAmount', colAmount);
    fd.append('colNotes', colNotes);
    if (colType) fd.append('colType', colType);

    try {
      const res = await fetch('/api/import/csv', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ? String(data.error) : 'Error al importar');
      } else {
        setMessage(`Importados: ${data.inserted} | Payees creados: ${data.payeesCreated} | Categorías creadas: ${data.categoriesCreated} | Omitidos: ${data.skipped}`);
      }
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Cuenta destino</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded border p-2" required>
            <option value="">Selecciona…</option>
            {accounts.map(a => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Archivo CSV</label>
          <input type="file" name="file" accept=".csv,text/csv" className="w-full" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Formato</label>
          <select
            value={preset}
            onChange={(e) => {
              const p = e.target.value;
              setPreset(p);
              if (p === 'ing-nl') {
                setDelimiter(',');
                setDateFormat('ymd');
                setHasHeader(true);
                setColDate('Date');
                setColDesc('Name / Description');
                setColAmount('Amount (EUR)');
                setColNotes('Notifications');
                setColType('Debit/credit');
              } else if (p === 'revolut') {
                setDelimiter(',');
                setDateFormat('ymd');
                setHasHeader(true);
                setColDate('Date');
                setColDesc('Description');
                setColAmount('Amount');
                setColNotes('Notes');
                setColType('Type');
              } else if (p === 'abn-amro') {
                setDelimiter(';');
                setDateFormat('dmy');
                setHasHeader(true);
                setColDate('Datum');
                setColDesc('Omschrijving');
                setColAmount('Bedrag (EUR)');
                setColNotes('Toelichting');
                setColType('Mutatie');
              } else if (p === 'rabobank') {
                setDelimiter(',');
                setDateFormat('dmy');
                setHasHeader(true);
                setColDate('Datum');
                setColDesc('Naam/Omschrijving');
                setColAmount('Bedrag');
                setColNotes('Mededelingen');
                setColType('Af/Bij');
              } else {
                // custom: no change, el usuario edita manualmente
              }
            }}
            className="w-full rounded border p-2"
          >
            <option value="custom">Personalizado</option>
            <option value="ing-nl">ING (NL)</option>
            <option value="revolut">Revolut</option>
            <option value="abn-amro">ABN AMRO</option>
            <option value="rabobank">Rabobank</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Delimitador</label>
          <input type="text" value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Formato de fecha</label>
          <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value as any)} className="w-full rounded border p-2">
            <option value="dmy">día/mes/año</option>
            <option value="ymd">año-mes-día</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input id="hasHeader" type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
          <label htmlFor="hasHeader" className="text-sm text-gray-600">Primera fila es cabecera</label>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Mapeo de columnas (por nombre de cabecera):</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Fecha</label>
            <input type="text" value={colDate} onChange={(e) => setColDate(e.target.value)} className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Descripción</label>
            <input type="text" value={colDesc} onChange={(e) => setColDesc(e.target.value)} className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Monto</label>
            <input type="text" value={colAmount} onChange={(e) => setColAmount(e.target.value)} className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Notas</label>
            <input type="text" value={colNotes} onChange={(e) => setColNotes(e.target.value)} className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo (Debit/Credit, opcional)</label>
            <input type="text" value={colType} onChange={(e) => setColType(e.target.value)} className="w-full rounded border p-2" placeholder="Debit/credit" />
            <p className="text-xs text-gray-500 mt-1">Si tu CSV tiene una columna con valores "Debit"/"Credit" (como ING), indícala aquí.</p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <button type="submit" className="rounded bg-blue-600 text-white px-4 py-2" disabled={loading}>
        {loading ? 'Importando…' : 'Importar CSV'}
      </button>
    </form>
  );
}