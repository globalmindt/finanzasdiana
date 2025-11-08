"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<'bank' | 'cash' | 'wallet'>('bank');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          currency: 'EUR',
          initialBalance: Number(initialBalance),
          isActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? String(data.error) : 'Error al crear la cuenta');
        return;
      }
      setName('');
      setType('bank');
      setInitialBalance(0);
      setIsActive(true);
      router.refresh();
    } catch (e) {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Nombre</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border p-2"
          placeholder="Nombre de la cuenta"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'bank' | 'cash' | 'wallet')}
            className="w-full rounded border p-2"
          >
            <option value="bank">Banco</option>
            <option value="cash">Efectivo</option>
            <option value="wallet">Billetera</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Saldo inicial</label>
          <input
            type="number"
            step="0.01"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
            className="w-full rounded border p-2"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="isActive"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border"
        />
        <label htmlFor="isActive" className="text-sm text-gray-700">Activa</label>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-block rounded bg-blue-600 px-4 py-2 text-white"
      >
        {loading ? 'Guardando…' : 'Agregar cuenta'}
      </button>
    </form>
  );
}