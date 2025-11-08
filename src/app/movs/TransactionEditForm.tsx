"use client";
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type Account = { _id: string; name: string; type: string };
type Category = { _id: string; name: string; kind: 'income' | 'expense' };
type Payee = { _id: string; name: string; type: 'income' | 'expense' | 'both'; defaultCategoryId?: string; defaultAmount?: number; defaultNotes?: string; isFixed?: boolean; frequency?: string; billingDayOfMonth?: number };
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
  payeeId?: string;
  payeeName?: string;
  tags?: string[];
  reference?: string;
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
  payees,
}: {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  payees: Payee[];
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
  const [payeeId, setPayeeId] = useState<string>(transaction.payeeId || '');
  const [payeeName, setPayeeName] = useState<string>(transaction.payeeName || '');
  const [tagsStr, setTagsStr] = useState<string>((transaction as any).tags?.join(', ') || '');
  const [reference, setReference] = useState<string>((transaction as any).reference || '');

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
        payload.payeeId = payeeId || undefined;
        payload.payeeName = payeeName || undefined;
        // limpiar campos de transferencia si cambiaron tipo
        payload.fromAccountId = undefined;
        payload.toAccountId = undefined;
      } else if (type === 'transfer') {
        payload.fromAccountId = fromAccountId;
        payload.toAccountId = toAccountId;
        // limpiar campos de income/expense si cambiaron tipo
        payload.accountId = undefined;
        payload.categoryId = undefined;
        payload.payeeId = undefined;
        payload.payeeName = undefined;
      }

      const tags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      if (tags.length) payload.tags = tags;
      if (reference) payload.reference = reference;

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
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded border p-2">
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
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Origen / Servicio (opcional)</label>
            <select
              value={payeeId}
              onChange={(e) => {
                const id = e.target.value;
                setPayeeId(id);
                const p = payees.find((pp) => pp._id === id);
                if (!p) return;
                if (!categoryId && p.defaultCategoryId) setCategoryId(p.defaultCategoryId);
                if (!amount && typeof p.defaultAmount === 'number') setAmount(p.defaultAmount);
                if (!notes && p.defaultNotes) setNotes(p.defaultNotes);
              }}
              className="w-full rounded border p-2"
            >
              <option value="">Opcional…</option>
              {payees
                .filter((p) => p.type === 'both' || p.type === type)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <div className="mt-2">
              <label className="block text-sm text-gray-600 mb-1">Nombre de origen (manual, opcional)</label>
              <input type="text" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} className="w-full rounded border p-2" placeholder="Si no deseas seleccionar, escribe un nombre" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Desde cuenta</label>
            <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className="w-full rounded border p-2">
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
            <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="w-full rounded border p-2">
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tags (opcional)</label>
          <input type="text" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className="w-full rounded border p-2" placeholder="separados por coma" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Referencia (opcional)</label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full rounded border p-2" />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="inline-block rounded bg-blue-600 px-4 py-2 text-white">
        {loading ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}