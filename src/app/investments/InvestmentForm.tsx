"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InvestmentForm() {
  const router = useRouter();
  const [instrument, setInstrument] = useState('');
  const [platform, setPlatform] = useState('');
  const [contrib, setContrib] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const contributionsTotal = Number(contrib) || 0;
    const currentValue = Number(value) || 0;
    if (!instrument.trim() || !platform.trim()) {
      setError('Instrumento y plataforma son requeridos');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrument: instrument.trim(), platform: platform.trim(), contributionsTotal, currentValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Error al guardar');
      }
      setInstrument('');
      setPlatform('');
      setContrib('');
      setValue('');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-600">Instrumento</label>
        <input value={instrument} onChange={e => setInstrument(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="ETF/Acción (p.ej., VUSA, AAPL)" />
      </div>
      <div>
        <label className="block text-xs text-gray-600">Plataforma</label>
        <input value={platform} onChange={e => setPlatform(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Broker (p.ej., Degiro)" />
      </div>
      <div>
        <label className="block text-xs text-gray-600">Contribuciones (€)</label>
        <input value={contrib} onChange={e => setContrib(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="0" inputMode="decimal" />
      </div>
      <div>
        <label className="block text-xs text-gray-600">Valor actual (€)</label>
        <input value={value} onChange={e => setValue(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="0" inputMode="decimal" />
      </div>
      <div>
        <button type="submit" disabled={saving} className="px-3 py-2 rounded bg-blue-600 text-white">
          {saving ? 'Guardando…' : 'Agregar'}
        </button>
      </div>
      {error && <p className="sm:col-span-5 text-sm text-rose-700">{error}</p>}
    </form>
  );
}