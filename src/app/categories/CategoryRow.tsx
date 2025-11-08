"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CategoryDeleteButton from './CategoryDeleteButton';

type Category = {
  _id: string;
  name: string;
  kind: 'income' | 'expense';
  fixedOrVariable?: 'fixed' | 'variable' | 'na';
  color?: string;
};

export default function CategoryRow({ cat }: { cat: Category }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [kind, setKind] = useState<Category['kind']>(cat.kind);
  const [fixedOrVariable, setFixedOrVariable] = useState<Category['fixedOrVariable']>(cat.fixedOrVariable || 'na');
  const [color, setColor] = useState(cat.color || '#888888');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${cat._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind, fixedOrVariable, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? String(data.error) : 'Error al guardar');
        return;
      }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="py-2 px-1 flex items-center justify-between">
      <div className="flex-1">
        {!editing ? (
          <div className="flex items-center gap-3">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-gray-500">
                {kind === 'income' ? 'Ingreso' : 'Gasto'}
                {fixedOrVariable && fixedOrVariable !== 'na' ? ` • ${fixedOrVariable}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 w-full">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nombre</label>
              <input className="w-full rounded border p-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tipo</label>
              <select className="w-full rounded border p-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value as any)}>
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fijo/Variable</label>
              <select className="w-full rounded border p-2 text-sm" value={fixedOrVariable} onChange={(e) => setFixedOrVariable(e.target.value as any)}>
                <option value="na">N/A</option>
                <option value="fixed">Fijo</option>
                <option value="variable">Variable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Color</label>
              <input type="color" className="rounded border h-10 w-16" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 ml-3">
        {!editing ? (
          <button onClick={() => setEditing(true)} className="rounded bg-gray-200 px-3 py-1 text-xs">Editar</button>
        ) : (
          <>
            <button onClick={onSave} disabled={loading} className="rounded bg-blue-600 px-3 py-1 text-white text-xs">
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setEditing(false)} className="rounded bg-gray-200 px-3 py-1 text-xs">Cancelar</button>
          </>
        )}
        <CategoryDeleteButton id={cat._id} />
        {error && <span className="text-red-600 text-xs">{error}</span>}
      </div>
    </li>
  );
}