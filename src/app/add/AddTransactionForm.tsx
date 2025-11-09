"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Account = { _id: string; name: string; type: string };
type Category = { _id: string; name: string; kind: 'income' | 'expense' };
type Payee = { _id: string; name: string; type: 'income' | 'expense' | 'both'; defaultCategoryId?: string; defaultAmount?: number; defaultNotes?: string; billingDate?: string; billingDayOfMonth?: number; isFixed?: boolean };

export default function AddTransactionForm({ accounts, categories, payees }: { accounts: Account[]; categories: Category[]; payees: Payee[] }) {
  const router = useRouter();
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('income');
  const [date, setDate] = useState<string>('');
  const [dateTouched, setDateTouched] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [payeeId, setPayeeId] = useState<string>('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [payeesList, setPayeesList] = useState<Payee[]>(payees);
  // La creación de orígenes se gestiona en /payees
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Establecer fecha local al montar para evitar desajustes de hidratación
  useEffect(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    setDate(`${y}-${m}-${dd}T${hh}:${mm}`);
  }, []);

  function pickReceiptPhoto() {
    setError(null);
    fileInputRef.current?.click();
  }

  async function onReceiptSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setScanning(true);
      setOcrProgress(0);
      setImagePreview(URL.createObjectURL(file));
      const Tesseract: any = await import('tesseract.js');
      const logger = (m: any) => {
        if (m && typeof m.progress === 'number') setOcrProgress(Math.round(m.progress * 100));
      };
      // Preferir español, caer a inglés si falla
      let text = '';
      try {
        const res = await Tesseract.recognize(file, 'spa', { logger });
        text = res?.data?.text || '';
      } catch {
        const res2 = await Tesseract.recognize(file, 'eng', { logger });
        text = res2?.data?.text || '';
      }
      const parsed = parseReceiptText(text);
      // Rellenos básicos
      setType('expense');
      if (parsed.amount != null) setAmount(parsed.amount);
      if (parsed.dateLocal) setDate(parsed.dateLocal);
      // Intentar casar origen
      const merchant = parsed.merchant?.toLowerCase();
      if (merchant) {
        const match = payeesList.find(p => merchant.includes(p.name.toLowerCase()));
        if (match) setPayeeId(match._id);
      }
      // Añadir a notas un resumen
      const summaryParts = [
        parsed.merchant ? `Comercio: ${parsed.merchant}` : null,
        parsed.dateDisplay ? `Fecha: ${parsed.dateDisplay}` : null,
        parsed.amount != null ? `Monto detectado: ${parsed.amount}` : null,
      ].filter(Boolean);
      if (summaryParts.length) {
        setNotes(n => (n ? `${n}\n` : '') + `Factura escaneada → ${summaryParts.join(' · ')}`);
      }
    } catch (err) {
      setError('No se pudo leer la factura. Prueba con otra foto.');
    } finally {
      setScanning(false);
      setOcrProgress(0);
      // Limpia el input para permitir re-selección del mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function parseReceiptText(text: string) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    // Monto: buscar el mayor número con decimales
    const moneyRegex = /(\$|€|usd|mxn)?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/gi;
    let amount: number | null = null;
    let max = 0;
    for (const m of text.matchAll(moneyRegex)) {
      const raw = (m[2] || '').replace(/\./g, '').replace(/,/g, '.');
      const val = Number(raw);
      if (!isNaN(val) && val > max) { max = val; amount = val; }
    }
    // Fecha: formatos comunes
    const dateRegexes = [
      /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, // dd/mm/yyyy
      /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/, // yyyy-mm-dd
    ];
    let dateDisplay: string | null = null;
    let dateLocal: string | null = null;
    for (const rx of dateRegexes) {
      const m = text.match(rx);
      if (m) {
        if (rx === dateRegexes[0]) {
          // dd/mm/yyyy
          const d = Number(m[1]);
          const mo = Number(m[2]);
          const y = Number(m[3]);
          dateDisplay = `${String(d).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`;
          const dt = new Date(y, mo - 1, d, 12, 0);
          dateLocal = fmtLocal(dt);
        } else {
          // yyyy-mm-dd
          const y = Number(m[1]);
          const mo = Number(m[2]);
          const d = Number(m[3]);
          dateDisplay = `${String(d).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`;
          const dt = new Date(y, mo - 1, d, 12, 0);
          dateLocal = fmtLocal(dt);
        }
        break;
      }
    }
    // Comercio: primera línea destacada que no sea palabras comunes
    const blacklist = ['factura', 'ticket', 'recibo', 'subtotal', 'total', 'iva', 'rfc', 'cif'];
    let merchant: string | null = null;
    for (const l of lines) {
      const clean = l.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 &.-]/g, '');
      if (clean.length < 4) continue;
      const low = clean.toLowerCase();
      if (blacklist.some(b => low.includes(b))) continue;
      merchant = clean;
      break;
    }
    return { amount, dateDisplay, dateLocal, merchant };
  }

  function fmtLocal(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}-${m}-${dd}T${hh}:${mm}`;
  }

  const categoriesByType = categories.filter(c => (type === 'income' ? c.kind === 'income' : c.kind === 'expense'));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = { type, amount: Number(amount), date: new Date(date).toISOString(), notes };
      if (type === 'income' || type === 'expense') {
        payload.accountId = accountId;
        if (categoryId) payload.categoryId = categoryId;
        if (payeeId) payload.payeeId = payeeId;
      } else if (type === 'transfer') {
        payload.fromAccountId = fromAccountId;
        payload.toAccountId = toAccountId;
      }
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? String(data.error) : 'Error al crear movimiento');
        return;
      }
      setAmount(0);
      setNotes('');
      setPayeeId('');
      setAccountId('');
      setCategoryId('');
      setFromAccountId('');
      setToAccountId('');
      router.replace('/movs');
    } catch (e) {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full rounded border p-2">
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Fecha</label>
          <input type="datetime-local" value={date} onChange={(e) => { setDate(e.target.value); setDateTouched(true); }} className="w-full rounded border p-2" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Monto</label>
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded border p-2" />
      </div>

      {type !== 'transfer' ? (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Cuenta</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded border p-2">
            <option value="">Selecciona…</option>
            {accounts.map(a => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Origen / Servicio</label>
          <select value={payeeId} onChange={(e) => {
            const id = e.target.value;
            setPayeeId(id);
            const p = payeesList.find(pp => pp._id === id);
            if (!p) return;
            // Autorrellenar si hay configuraciones
            if (p.defaultCategoryId) setCategoryId(p.defaultCategoryId);
            if (!amount && typeof p.defaultAmount === 'number') setAmount(p.defaultAmount);
            if (!notes && p.defaultNotes) setNotes(p.defaultNotes);
            // Autorrellenar fecha si es servicio mensual fijo y el usuario no ha tocado la fecha
            if (!dateTouched && p.isFixed && (p as any).frequency === 'mensual' && typeof p.billingDayOfMonth === 'number') {
              const parseCurrent = () => {
                try { return new Date(date); } catch { return new Date(); }
              };
              const base = parseCurrent();
              const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();
              const nextMonthlyOccurrence = (dayOfMonth: number, baseDate: Date) => {
                const year = baseDate.getFullYear();
                const month = baseDate.getMonth();
                const hours = baseDate.getHours();
                const minutes = baseDate.getMinutes();
                const dim = daysInMonth(year, month);
                const targetDay = Math.min(dayOfMonth, dim);
                let target = new Date(year, month, targetDay, hours, minutes);
                if (target <= baseDate) {
                  const nextMonth = month + 1;
                  const nextYear = year + (nextMonth > 11 ? 1 : 0);
                  const nextMonthIndex = nextMonth % 12;
                  const dimNext = daysInMonth(nextYear, nextMonthIndex);
                  const targetDayNext = Math.min(dayOfMonth, dimNext);
                  target = new Date(nextYear, nextMonthIndex, targetDayNext, hours, minutes);
                }
                return target;
              };
              const fmtLocal = (d: Date) => {
                const pad = (n: number) => String(n).padStart(2, '0');
                const y = d.getFullYear();
                const m = pad(d.getMonth() + 1);
                const dd = pad(d.getDate());
                const hh = pad(d.getHours());
                const mm = pad(d.getMinutes());
                return `${y}-${m}-${dd}T${hh}:${mm}`;
              };
              const next = nextMonthlyOccurrence(p.billingDayOfMonth, base);
              setDate(fmtLocal(next));
            }
          }} className="w-full rounded border p-2">
            <option value="">Opcional…</option>
            {payeesList
              .filter(p => p.type === 'both' || p.type === type)
              .map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
          </select>
          <div className="mt-2">
            <p className="text-xs text-gray-600">Configura y crea orígenes en <a href="/payees" className="text-blue-600">Servicios</a>.</p>
          </div>
          <div className="mt-3 p-2 border rounded">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={pickReceiptPhoto} className="rounded bg-green-600 px-3 py-1.5 text-white text-sm">
                {scanning ? 'Leyendo factura…' : 'Escanear factura'}
              </button>
              {scanning && <span className="text-xs text-gray-600">{ocrProgress}%</span>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onReceiptSelected}
            />
            {imagePreview && (
              <div className="mt-2">
                <img src={imagePreview} alt="Factura" className="max-h-40 rounded border" />
                <p className="text-xs text-gray-600 mt-1">Vista previa de la factura</p>
              </div>
            )}
            <p className="text-xs text-gray-600 mt-2">Toma una foto y se rellenará monto, fecha y posible comercio.</p>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Categoría (opcional)</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded border p-2">
            <option value="">Ninguna</option>
            {categoriesByType.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Desde cuenta</label>
            <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className="w-full rounded border p-2">
              <option value="">Selecciona…</option>
              {accounts.map(a => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Hacia cuenta</label>
            <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="w-full rounded border p-2">
              <option value="">Selecciona…</option>
              {accounts.map(a => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-600 mb-1">Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded border p-2" rows={3} />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="inline-block rounded bg-blue-600 px-4 py-2 text-white">
        {loading ? 'Guardando…' : 'Agregar movimiento'}
      </button>
    </form>
  );
}