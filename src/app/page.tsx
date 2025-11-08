import Link from 'next/link';
import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function formatEUR(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default async function Home() {
  const auth = await getAuthUser();
  let ingresosMes = 0;
  let egresosMes = 0;
  let proximosPagos = 0;

  if (auth?.userId) {
    const transactions = await getCollection('transactions');
    const recurrents = await getCollection('recurrents');
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const cursor = transactions.find({
      userId: auth.userId,
      date: { $gte: monthStart, $lte: monthEnd },
      type: { $in: ['income', 'expense'] },
    });
    const txs = await cursor.toArray();
    for (const t of txs as any[]) {
      if (t.type === 'income') ingresosMes += t.amount || 0;
      else if (t.type === 'expense') egresosMes += t.amount || 0;
    }

    const next14 = new Date(now);
    next14.setUTCDate(next14.getUTCDate() + 14);
    proximosPagos = await recurrents.countDocuments({ userId: auth.userId, nextRunDate: { $gte: now, $lte: next14 } });
  }

  const ahorroNeto = ingresosMes - egresosMes;

  return (
    <div className="p-4">
      <main>
        <h1 className="text-xl font-semibold">Inicio</h1>
        {!auth?.userId ? (
          <div className="mt-4 rounded bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-gray-700">No has iniciado sesión.</p>
            <p className="text-sm text-gray-700">Por favor, entra para ver tus datos reales.</p>
            <div className="mt-3">
              <Link href="/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">Entrar</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Ingresos mes</p>
              <p className="text-2xl font-bold">{formatEUR(ingresosMes)}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Egresos mes</p>
              <p className="text-2xl font-bold">{formatEUR(egresosMes)}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Ahorro neto</p>
              <p className="text-2xl font-bold">{formatEUR(ahorroNeto)}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Próximos pagos</p>
              <p className="text-2xl font-bold">{proximosPagos}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
