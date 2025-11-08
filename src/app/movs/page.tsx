import Link from 'next/link';
import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Suspense } from 'react';

function formatEUR(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default async function MovimientosPage({ searchParams }: { searchParams?: { from?: string; to?: string; type?: string } }) {
  const auth = await getAuthUser();
  if (!auth?.userId) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Movimientos</h1>
        <div className="mt-4 rounded bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-gray-700">No has iniciado sesión.</p>
          <p className="text-sm text-gray-700">Por favor, entra para ver tus datos reales.</p>
          <div className="mt-3">
            <Link href="/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">Entrar</Link>
          </div>
        </div>
      </div>
    );
  }

  const transactions = await getCollection('transactions');
  const query: any = { userId: auth.userId };
  if (searchParams?.type) query.type = searchParams.type;
  if (searchParams?.from || searchParams?.to) {
    query.date = {};
    if (searchParams.from) query.date.$gte = new Date(`${searchParams.from}T00:00:00.000Z`);
    if (searchParams.to) query.date.$lte = new Date(`${searchParams.to}T23:59:59.999Z`);
  }
  const cursor = transactions.find(query).sort({ date: -1 }).limit(50);
  const txs = await cursor.toArray();

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Movimientos</h1>
      <div className="mt-2 text-right">
        <Link href="/add" className="inline-block rounded bg-green-600 px-4 py-2 text-white">Agregar</Link>
      </div>
      <form method="get" className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipo</label>
          <select name="type" defaultValue={searchParams?.type || ''} className="w-full rounded border p-2">
            <option value="">Todos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Desde</label>
          <input type="date" name="from" defaultValue={searchParams?.from || ''} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Hasta</label>
          <input type="date" name="to" defaultValue={searchParams?.to || ''} className="w-full rounded border p-2" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="rounded bg-blue-600 text-white px-4 py-2">Filtrar</button>
        </div>
      </form>
      {txs.length === 0 ? (
        <div className="text-gray-600 mt-2">
          <p>Aún no hay movimientos.</p>
          <div className="mt-2">
            <Link href="/add" className="inline-block rounded bg-green-600 px-3 py-1 text-white text-sm">Agregar movimiento</Link>
          </div>
        </div>
      ) : (
        <ul className="mt-4 divide-y rounded bg-white shadow-sm">
          {txs.map((t: any) => (
            <li key={t._id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t.description || (t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Movimiento')}</p>
                <p className="text-xs text-gray-500">{new Date(t.date).toLocaleString('es-ES')}</p>
              </div>
              <div className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : t.type === 'expense' ? 'text-red-600' : 'text-gray-700'}`}>
                {formatEUR(Number(t.amount || 0))}
                <Link href={`/movs/${t._id}`} className="ml-3 text-xs text-blue-600">Editar</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}