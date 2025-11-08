"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CategoryCreateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'income' | 'expense'>('expense');
  const [fixedOrVariable, setFixedOrVariable] = useState<'fixed' | 'variable' | 'na'>('na');
  const [color, setColor] = useState('#888888');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind, fixedOrVariable, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? String(data.error) : 'Error al crear');
        return;
      }
      setName('');
      setFixedOrVariable('na');
      setColor('#888888');
      router.refresh();
    } catch (e) {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Nombre</label>
          <input className="w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipo</label>
          <select className="w-full rounded border p-2" value={kind} onChange={(e) => setKind(e.target.value as any)}>
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Fijo/Variable</label>
          <select className="w-full rounded border p-2" value={fixedOrVariable} onChange={(e) => setFixedOrVariable(e.target.value as any)}>
            <option value="na">N/A</option>
            <option value="fixed">Fijo</option>
            <option value="variable">Variable</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Color</label>
          <input type="color" className="w-full rounded border p-2 h-10" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="inline-block rounded bg-blue-600 px-4 py-2 text-white">
        {loading ? 'Guardando…' : 'Agregar categoría'}
      </button>
    </form>
  );
}