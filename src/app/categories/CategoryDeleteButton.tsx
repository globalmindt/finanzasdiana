"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CategoryDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm('¿Eliminar esta categoría?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? String(data.error) : 'Error al eliminar');
        return;
      }
      router.refresh();
    } catch (e) {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={onDelete} disabled={loading} className="rounded bg-red-600 px-3 py-1 text-white text-xs">
        {loading ? 'Eliminando…' : 'Eliminar'}
      </button>
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </div>
  );
}