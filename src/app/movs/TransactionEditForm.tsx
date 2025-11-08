"use client";
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type Account = { _id: string; name: string; type: string };
type Category = { _id: string; name: string; kind: 'income' | 'expense' };
type Transaction = {
  _id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string | Date;
  accountId?: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  notes?: string;
};

function toLocalInput(dt: string | Date) {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  const iso = new Date(d).toISOString();
  return iso.slice(0, 16);
}

export default function TransactionEditForm({
  transaction,
  accounts,
  categories,
}: {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const [type, setType] = useState<Transaction['type']>(transaction.type);
  const [date, setDate] = useState<string>(toLocalInput(transaction.date));
  const [amount, setAmount] = useState<number>(Number(transaction.amount || 0));
  const [accountId, setAccountId] = useState<string>(transaction.accountId || '');
  const [categoryId, setCategoryId] = useState<string>(transaction.categoryId || '');
  const [fromAccountId, setFromAccountId] = useState<string>(transaction.fromAccountId || '');
  const [toAccountId, setToAccountId] = useState<string>(transaction.toAccountId || '');
  const [notes, setNotes] = useState<string>(transaction.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesByType = useMemo(
    () => categories.filter((c) => (type === 'income' ? c.kind === 'income' : c.kind === 'expense')),
    [categories, type]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = { type, amount: Number(amount), date: new Date(date).toISOString(), notes };
      if (type === 'income' || type === 'expense') {
        payload.accountId = accountId;
        payload.categoryId = categoryId || undefined;
        // limpiar campos de transferencia si cambiaron tipo
        payload.fromAccountId = undefined;
        payload.toAccountId = undefined;
      } else if (type === 'transfer') {
        payload.fromAccountId = fromAccountId;
        payload.toAccountId = toAccountId;
        // limpiar campos de income/expense si cambiaron tipo
        payload.accountId = undefined;
        payload.categoryId = undefined;
      }

      const res = await fetch(`/api/transactions/${transaction._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? String(data.error) : 'Error al actualizar');
        return;
      }
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
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border p-2" />
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
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded border p-2" required>
              <option value="">Selecciona…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
          <label className="block text-sm text-gray-600 mb-1">Categoría (opcional)</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded border p-2">
            <option value="">Ninguna</option>
            {categoriesByType.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Desde cuenta</label>
            <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className="w-full rounded border p-2" required>
              <option value="">Selecciona…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Hacia cuenta</label>
            <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="w-full rounded border p-2" required>
              <option value="">Selecciona…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
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
        {loading ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}