import Link from 'next/link';
import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function formatEUR(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function getMonthRange(monthParam?: string) {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-based
  if (monthParam && /^(\d{4})-(\d{2})$/.test(monthParam)) {
    const [y, m] = monthParam.split('-');
    year = Number(y);
    month = Number(m) - 1;
  }
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const label = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(start);
  const inputValue = `${String(year)}-${String(month + 1).padStart(2, '0')}`;
  return { start, end, label, inputValue, year, month };
}

function buildNetSparklinePoints(txs: any[], year: number, month: number, width = 220, height = 48) {
  // Build cumulative net by day for selected month
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const dailyNet: number[] = Array.from({ length: daysInMonth }, () => 0);
  for (const t of txs as any[]) {
    const d = new Date(t.date);
    const day = d.getUTCDate();
    if (day >= 1 && day <= daysInMonth) {
      const delta = t.type === 'income' ? (t.amount || 0) : t.type === 'expense' ? -(t.amount || 0) : 0;
      dailyNet[day - 1] += delta;
    }
  }
  const cumulative: number[] = [];
  let acc = 0;
  for (let i = 0; i < daysInMonth; i++) {
    acc += dailyNet[i];
    cumulative.push(acc);
  }
  const minVal = Math.min(...cumulative, 0);
  const maxVal = Math.max(...cumulative, 0);
  const range = maxVal - minVal || 1;
  const xStep = width / Math.max(daysInMonth - 1, 1);
  const points: string[] = cumulative.map((v, i) => {
    const x = Math.round(i * xStep);
    const y = Math.round(height - ((v - minVal) / range) * height);
    return `${x},${y}`;
  });
  return points.join(' ');
}

export default async function Home({ searchParams }: { searchParams?: { month?: string } }) {
  const auth = await getAuthUser();
  const monthParam = searchParams?.month;
  const { start: monthStart, end: monthEnd, label: monthLabel, inputValue: monthInputValue, year, month } = getMonthRange(monthParam);
  const lastDayDate = new Date(Date.UTC(year, month + 1, 0));
  const fromStr = `${String(year)}-${String(month + 1).padStart(2, '0')}-01`;
  const toStr = `${String(year)}-${String(month + 1).padStart(2, '0')}-${String(lastDayDate.getUTCDate()).padStart(2, '0')}`;
  let ingresosMes = 0;
  let egresosMes = 0;
  let proximosPagos = 0;

  let monthTxs: any[] = [];
  if (auth?.userId) {
    const transactions = await getCollection('transactions');
    const recurrents = await getCollection('recurrents');

    const cursor = transactions.find({
      userId: auth.userId,
      date: { $gte: monthStart, $lte: monthEnd },
      type: { $in: ['income', 'expense'] },
    });
    monthTxs = await cursor.toArray();
    for (const t of monthTxs as any[]) {
      if (t.type === 'income') ingresosMes += t.amount || 0;
      else if (t.type === 'expense') egresosMes += t.amount || 0;
    }

    // Próximos pagos dentro del mes seleccionado
    proximosPagos = await recurrents.countDocuments({ userId: auth.userId, nextRunDate: { $gte: monthStart, $lte: monthEnd } });
  }

  const ahorroNeto = ingresosMes - egresosMes;

  return (
    <div className="p-4">
      <main className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Inicio</h1>
            <p className="text-sm text-gray-500">Resumen de {monthLabel}</p>
          </div>
          <form className="hidden sm:flex items-center gap-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-md px-3 py-1" method="get">
            <label htmlFor="month" className="sr-only">Mes</label>
            <input id="month" name="month" type="month" defaultValue={monthInputValue} className="text-sm text-gray-900 bg-white border-none focus:outline-none" />
            <button type="submit" className="rounded bg-blue-600 text-white px-2 py-1">Aplicar</button>
          </form>
        </header>

        {!auth?.userId ? (
          <section className="rounded-lg bg-white border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900">Accede para ver tu panel</h2>
            <p className="text-sm text-gray-600 mt-1">Inicia sesión para visualizar tus métricas financieras.</p>
            <div className="mt-4">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition">
                <span aria-hidden>🔐</span>
                Entrar
              </Link>
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Ingresos mes</p>
                <p className="text-3xl font-bold text-emerald-600">{formatEUR(ingresosMes)}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Egresos mes</p>
                <p className="text-3xl font-bold text-rose-600">{formatEUR(egresosMes)}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Ahorro neto</p>
                <p className={`text-3xl font-bold ${ahorroNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatEUR(ahorroNeto)}
                </p>
                {auth?.userId ? (
                  <div className="mt-3">
                    <svg width="220" height="48" viewBox={`0 0 220 48`} className="w-full" aria-label="Tendencia ahorro neto">
                      <polyline
                        points={buildNetSparklinePoints(monthTxs, year, month)}
                        fill="none"
                        stroke="currentColor"
                        className="text-indigo-500"
                        strokeWidth="2"
                      />
                    </svg>
                    <p className="mt-1 text-xs text-gray-500">Tendencia del mes</p>
                  </div>
                ) : null}
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Próximos pagos</p>
                <p className="text-3xl font-bold text-indigo-600">{proximosPagos}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/movs?from=${fromStr}&to=${toStr}`} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-800 hover:bg-gray-50">
                <span aria-hidden>📄</span>
                Ver movimientos
              </Link>
              <Link href="/add" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                <span aria-hidden>➕</span>
                Agregar
              </Link>
              <Link href="/accounts" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-800 hover:bg-gray-50">
                <span aria-hidden>🏦</span>
                Cuentas
              </Link>
              <Link href="/payees" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-800 hover:bg-gray-50">
                <span aria-hidden>🧩</span>
                Servicios
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
