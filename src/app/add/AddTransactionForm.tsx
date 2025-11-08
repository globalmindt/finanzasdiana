"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Account = { _id: string; name: string; type: string };
type Category = { _id: string; name: string; kind: 'income' | 'expense' };
type Payee = { _id: string; name: string; type: 'income' | 'expense' | 'both'; defaultCategoryId?: string; defaultAmount?: number; defaultNotes?: string; billingDate?: string; billingDayOfMonth?: number; isFixed?: boolean };

export default function AddTransactionForm({ accounts, categories, payees }: { accounts: Account[]; categories: Category[]; payees: Payee[] }) {
  const router = useRouter();
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('income');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 16));
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