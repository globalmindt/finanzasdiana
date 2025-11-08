import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Link from 'next/link';
import InvestmentForm from '@/app/investments/InvestmentForm';

function formatEUR(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

async function fetchInvestments(userId: string) {
  const investmentsCol = await getCollection('investments');
  const list = await investmentsCol.find({ userId }).sort({ lastUpdate: -1 }).toArray();
  return list as any[];
}

export default async function InvestmentsPage() {
  const auth = await getAuthUser();
  if (!auth?.userId) {
    return (
      <main className="p-4">
        <h1 className="text-xl font-semibold">Inversiones</h1>
        <p className="mt-2 text-gray-600">Necesitas iniciar sesión.</p>
        <Link href="/login" className="text-blue-600">Ir a login</Link>
      </main>
    );
  }

  const items = await fetchInvestments(auth.userId);
  const totalValor = items.reduce((s, it: any) => s + (it.currentValue || 0), 0);
  const totalContrib = items.reduce((s, it: any) => s + (it.contributionsTotal || 0), 0);
  const totalPL = totalValor - totalContrib;

  return (
    <main className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Portafolio</h1>
        <Link href="/" className="text-sm text-blue-600">Volver al inicio</Link>
      </div>

      <section className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded border p-3">
          <p className="text-gray-600">Valor de cartera</p>
          <p className="text-lg font-semibold">{formatEUR(totalValor)}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-gray-600">Contribuciones</p>
          <p className="text-lg font-semibold">{formatEUR(totalContrib)}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-gray-600">P/L total</p>
          <p className={"text-lg font-semibold " + (totalPL >= 0 ? 'text-green-700' : 'text-rose-700')}>{formatEUR(totalPL)}</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Posiciones</h2>
        {items.length === 0 ? (
          <p className="mt-2 text-gray-600">Aún no hay inversiones registradas. Agrega la primera a continuación.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Instrumento</th>
                  <th className="py-2 pr-4">Plataforma</th>
                  <th className="py-2 pr-4">Contribuciones</th>
                  <th className="py-2 pr-4">Valor actual</th>
                  <th className="py-2 pr-4">P/L</th>
                  <th className="py-2 pr-4">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => {
                  const pl = (it.currentValue || 0) - (it.contributionsTotal || 0);
                  const last = it.lastUpdate ? new Date(it.lastUpdate) : null;
                  const lastStr = last ? last.toISOString().slice(0, 10) : '—';
                  return (
                    <tr key={String(it._id)} className="border-b">
                      <td className="py-2 pr-4">{it.instrument || '—'}</td>
                      <td className="py-2 pr-4">{it.platform || '—'}</td>
                      <td className="py-2 pr-4">{formatEUR(it.contributionsTotal || 0)}</td>
                      <td className="py-2 pr-4">{formatEUR(it.currentValue || 0)}</td>
                      <td className={"py-2 pr-4 " + (pl >= 0 ? 'text-green-700' : 'text-rose-700')}>{formatEUR(pl)}</td>
                      <td className="py-2 pr-4">{lastStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Agregar inversión</h2>
        <InvestmentForm />
      </section>
    </main>
  );
}