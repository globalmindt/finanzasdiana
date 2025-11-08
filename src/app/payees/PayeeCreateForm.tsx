"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Category = { _id: string; name: string; kind: 'income' | 'expense' };

export default function PayeeCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<'income' | 'expense' | 'both'>('expense');
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>("");
  const [defaultAmount, setDefaultAmount] = useState<number | "">("");
  const [defaultNotes, setDefaultNotes] = useState<string>("");
  const [isFixed, setIsFixed] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<string>("");
  const [billingDate, setBillingDate] = useState<string>("");
  const [billingDayOfMonth, setBillingDayOfMonth] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesForType = categories.filter(c => type === 'income' ? c.kind === 'income' : c.kind === 'expense');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        name,
        type,
        isFixed,
      };
      if (defaultCategoryId) payload.defaultCategoryId = defaultCategoryId;
      if (typeof defaultAmount === 'number' && !Number.isNaN(defaultAmount)) payload.defaultAmount = defaultAmount;
      if (defaultNotes) payload.defaultNotes = defaultNotes;
      if (frequency) payload.frequency = frequency;
      if (isFixed) {
        if (frequency === 'mensual' && typeof billingDayOfMonth === 'number' && billingDayOfMonth >= 1 && billingDayOfMonth <= 31) {
          payload.billingDayOfMonth = billingDayOfMonth;
        } else if (billingDate) {
          payload.billingDate = billingDate;
        }
      }
      const res = await fetch('/api/payees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? String(data.error) : 'Error al crear el servicio');
        return;
      }
      setName('');
      setType('expense');
      setDefaultCategoryId('');
      setDefaultAmount('');
      setDefaultNotes('');
      setIsFixed(false);
      setFrequency('');
      setBillingDate('');
      setBillingDayOfMonth('');
      router.refresh();
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Nombre</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border p-2" placeholder="Ej. Agua, Empresa, Netflix" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full rounded border p-2">
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Categoría por defecto (opcional)</label>
          <select value={defaultCategoryId} onChange={(e) => setDefaultCategoryId(e.target.value)} className="w-full rounded border p-2">
            <option value="">Ninguna</option>
            {categoriesForType.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Monto por defecto</label>
          <input
            type="number"
            step="0.01"
            value={defaultAmount === '' ? '' : String(defaultAmount)}
            onChange={(e) => {
              const v = e.target.value;
              setDefaultAmount(v === '' ? '' : Number(v));
            }}
            className="w-full rounded border p-2"
            placeholder="Ej. 50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Frecuencia</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full rounded border p-2"
          >
            <option value="">Selecciona…</option>
            <option value="puntual">Puntual</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
            <option value="bimestral">Bimestral</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input id="isFixed" type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} className="rounded border" />
        <label htmlFor="isFixed" className="text-sm text-gray-700">Fecha de cobro fija</label>
      </div>
      {isFixed && (
        <div className="grid grid-cols-2 gap-3">
          {frequency === 'mensual' ? (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Día del mes</label>
              <input
                type="number"
                min={1}
                max={31}
                value={billingDayOfMonth === '' ? '' : String(billingDayOfMonth)}
                onChange={(e) => {
                  const v = e.target.value;
                  setBillingDayOfMonth(v === '' ? '' : Math.max(1, Math.min(31, Number(v))));
                }}
                className="w-full rounded border p-2"
                placeholder="1–31"
              />
              <p className="text-xs text-gray-500 mt-1">Ej. 15 = día 15 de cada mes</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fecha de cobro</label>
              <input
                type="date"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                className="w-full rounded border p-2"
              />
            </div>
          )}
        </div>
      )}
      <div>
        <label className="block text-sm text-gray-600 mb-1">Notas por defecto</label>
        <input type="text" value={defaultNotes} onChange={(e) => setDefaultNotes(e.target.value)} className="w-full rounded border p-2" />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="inline-block rounded bg-blue-600 px-4 py-2 text-white">
        {loading ? 'Guardando…' : 'Agregar servicio'}
      </button>
    </form>
  );
}