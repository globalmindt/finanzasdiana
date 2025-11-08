"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PayeeDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm('¿Eliminar este servicio?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payees/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? String(data.error) : 'Error al eliminar');
        return;
      }
      router.refresh();
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button type="button" onClick={onDelete} disabled={loading} className="text-xs rounded bg-red-600 text-white px-3 py-1">
        {loading ? 'Eliminando…' : 'Eliminar'}
      </button>
    </div>
  );
}