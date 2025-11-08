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

export default async function Home({ searchParams: sp }: { searchParams?: { month?: string; from?: string; to?: string; preset?: string; type?: string; accountId?: string; categoryId?: string; payeeId?: string } | Promise<{ month?: string; from?: string; to?: string; preset?: string; type?: string; accountId?: string; categoryId?: string; payeeId?: string }> }) {
  const auth = await getAuthUser();
  const spResolved: any = await (sp as any);
  const monthParam = spResolved?.month;
  const { inputValue: monthInputValue } = getMonthRange(monthParam);

  function getSelectedRange(sp: any) {
    const now = new Date();
    const endToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const preset = (sp?.preset || '').trim();
    const from = (sp?.from || '').trim();
    const to = (sp?.to || '').trim();
    if (preset) {
      let start: Date = endToday;
      let end: Date = endToday;
      if (preset === 'last-7') {
        start = new Date(endToday.getTime() - 6 * 24 * 3600 * 1000);
      } else if (preset === 'last-30') {
        start = new Date(endToday.getTime() - 29 * 24 * 3600 * 1000);
      } else if (preset === 'last-90') {
        start = new Date(endToday.getTime() - 89 * 24 * 3600 * 1000);
      } else if (preset === 'last-365') {
        start = new Date(endToday.getTime() - 364 * 24 * 3600 * 1000);
      } else if (preset === 'year-current') {
        const y = now.getUTCFullYear();
        start = new Date(Date.UTC(y, 0, 1));
        end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      } else if (preset === 'year-previous') {
        const y = now.getUTCFullYear() - 1;
        start = new Date(Date.UTC(y, 0, 1));
        end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      } else {
        const { start: ms, end: me, label: ml } = getMonthRange(sp?.month);
        return { start: ms, end: me, label: `Resumen de ${ml}`, fromStr: ms.toISOString().slice(0, 10), toStr: me.toISOString().slice(0, 10), year: ms.getUTCFullYear(), month: ms.getUTCMonth(), kind: 'month' as const };
      }
      const label = `Resumen del ${start.toISOString().slice(0, 10)} al ${end.toISOString().slice(0, 10)}`;
      const isYearPreset = preset === 'year-current' || preset === 'year-previous';
      return { start, end, label, fromStr: start.toISOString().slice(0, 10), toStr: end.toISOString().slice(0, 10), year: start.getUTCFullYear(), month: start.getUTCMonth(), kind: isYearPreset ? ('year' as const) : ('rolling' as const), preset };
    }
    if (from && to) {
      const start = new Date(`${from}T00:00:00.000Z`);
      const end = new Date(`${to}T23:59:59.999Z`);
      const label = `Resumen del ${from} al ${to}`;
      return { start, end, label, fromStr: from, toStr: to, year: start.getUTCFullYear(), month: start.getUTCMonth(), kind: 'custom' as const };
    }
    const { start, end, label, year, month } = getMonthRange(sp?.month);
    return { start, end, label: `Resumen de ${label}`, fromStr: start.toISOString().slice(0, 10), toStr: end.toISOString().slice(0, 10), year, month, kind: 'month' as const };
  }

  const { start: rangeStart, end: rangeEnd, label: rangeLabel, fromStr, toStr, year, month, kind: rangeKind, preset: rangePreset } = getSelectedRange(spResolved);
  let ingresosMes = 0;
  let egresosMes = 0;
  let proximosPagos = 0;
  let recurrAmountTotal = 0;
  let daysUntilNextRecurrent: number | null = null;
  let ingresosPrev = 0;
  let egresosPrev = 0;
  let prevStartStr: string | null = null;
  let prevEndStr: string | null = null;
  let invCount = 0;
  let invValueTotal = 0;
  let invContribTotal = 0;
  const typeFilter = (spResolved?.type || '').trim();
  const accountIdFilter = (spResolved?.accountId || '').trim();
  const categoryIdFilter = (spResolved?.categoryId || '').trim();
  const payeeIdFilter = (spResolved?.payeeId || '').trim();
  // Listas para selects; inicializadas para evitar "used before assigned"
  let accountsList: any[] = [];
  let categoriesList: any[] = [];
  let payeesList: any[] = [];

  let monthTxs: any[] = [];
  if (auth?.userId) {
    const transactions = await getCollection('transactions');
    const recurrents = await getCollection('recurrents');
    const investmentsCol = await getCollection('investments');
    const accountsCol = await getCollection('accounts');
    const categoriesCol = await getCollection('categories');
    const payeesCol = await getCollection('payees');

    const query: any = {
      userId: auth.userId,
      date: { $gte: rangeStart, $lte: rangeEnd },
      ...(typeFilter ? { type: typeFilter } : { type: { $in: ['income', 'expense'] } }),
    };
    if (accountIdFilter) query.accountId = accountIdFilter;
    if (categoryIdFilter) query.categoryId = categoryIdFilter;
    if (payeeIdFilter) query.payeeId = payeeIdFilter;

    const cursor = transactions.find(query);
    monthTxs = await cursor.toArray();
    for (const t of monthTxs as any[]) {
      if (t.type === 'income') ingresosMes += t.amount || 0;
      else if (t.type === 'expense') egresosMes += t.amount || 0;
    }

    // Comparativa vs periodo anterior
    {
      let prevStart: Date;
      let prevEnd: Date;
      if (rangeKind === 'month') {
        // Mes anterior calendario
        const prevMonth = month - 1;
        const prevYear = prevMonth < 0 ? year - 1 : year;
        const prevMonthNorm = (prevMonth + 12) % 12;
        prevStart = new Date(Date.UTC(prevYear, prevMonthNorm, 1));
        prevEnd = new Date(Date.UTC(prevYear, prevMonthNorm + 1, 0, 23, 59, 59, 999));
      } else if (rangeKind === 'year') {
        // Año anterior calendario
        const y = year - 1;
        prevStart = new Date(Date.UTC(y, 0, 1));
        prevEnd = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      } else {
        // Igual duración inmediatamente anterior (rolling/custom)
        const msPerDay = 24 * 3600 * 1000;
        const startDayMs = Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate());
        const endDayMs = Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate());
        const daysInRangeLocal = Math.max(1, Math.round((endDayMs - startDayMs) / msPerDay) + 1);
        const prevEndDayMs = startDayMs - msPerDay; // día anterior al inicio
        const prevStartDayMs = startDayMs - daysInRangeLocal * msPerDay;
        prevStart = new Date(prevStartDayMs);
        prevEnd = new Date(prevEndDayMs + (msPerDay - 1));
      }

      // Etiqueta para tooltip en UI
      prevStartStr = prevStart.toISOString().slice(0, 10);
      prevEndStr = prevEnd.toISOString().slice(0, 10);

      const prevQuery: any = {
        userId: auth.userId,
        date: { $gte: prevStart, $lte: prevEnd },
        ...(typeFilter ? { type: typeFilter } : { type: { $in: ['income', 'expense'] } }),
      };
      if (accountIdFilter) prevQuery.accountId = accountIdFilter;
      if (categoryIdFilter) prevQuery.categoryId = categoryIdFilter;
      if (payeeIdFilter) prevQuery.payeeId = payeeIdFilter;

      const prevCursor = transactions.find(prevQuery);
      const prevTxs = await prevCursor.toArray();
      for (const t of prevTxs as any[]) {
        if (t.type === 'income') ingresosPrev += t.amount || 0;
        else if (t.type === 'expense') egresosPrev += t.amount || 0;
      }
    }

    // Próximos pagos y total comprometido dentro del rango seleccionado
    const recurrInRange = await recurrents.find({ userId: auth.userId, nextRunDate: { $gte: rangeStart, $lte: rangeEnd } }).toArray();
    proximosPagos = recurrInRange.length;
    recurrAmountTotal = recurrInRange.reduce((sum, r: any) => sum + (r.amount || 0), 0);
    // Días hasta el próximo pago (desde ahora)
    const now = new Date();
    const upcoming = await recurrents.find({ userId: auth.userId, nextRunDate: { $gte: now } }).sort({ nextRunDate: 1 }).limit(1).toArray();
    if (upcoming.length > 0) {
      const nextDate = new Date((upcoming[0] as any).nextRunDate);
      const diffMs = Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), nextDate.getUTCDate()) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      daysUntilNextRecurrent = Math.max(0, Math.round(diffMs / (24 * 3600 * 1000)));
    }

    // Listas para selects de filtros
    accountsList = await accountsCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();
    categoriesList = await categoriesCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();
    payeesList = await payeesCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();

    // Inversiones (resumen básico)
    try {
      const invCursor = investmentsCol.find({ userId: auth.userId });
      const invDocs = await invCursor.toArray();
      invCount = invDocs.length;
      for (const inv of invDocs as any[]) {
        invValueTotal += inv.currentValue || 0;
        invContribTotal += inv.contributionsTotal || 0;
      }
    } catch {}
  }

  const ahorroNeto = ingresosMes - egresosMes;
  const daysInRange = Math.max(1, Math.round((Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate()) - Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate())) / (24 * 3600 * 1000)) + 1);
  const tasaAhorro = ingresosMes > 0 ? ahorroNeto / ingresosMes : null;
  const ratioIngresosGastos = egresosMes > 0 ? ingresosMes / egresosMes : null;
  const burnRateDiario = egresosMes / daysInRange;
  const ahorroNetoPrev = ingresosPrev - egresosPrev;

  // Top categorías de gasto
  const gastoPorCategoria = new Map<string, number>();
  for (const t of monthTxs as any[]) {
    if (t.type === 'expense') {
      const key = String(t.categoryId || '');
      gastoPorCategoria.set(key, (gastoPorCategoria.get(key) || 0) + (t.amount || 0));
    }
  }
  const topCats = Array.from(gastoPorCategoria.entries())
    .filter(([k]) => k)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => ({ id: k, amount: v, name: ((categoriesList || []).find((c: any) => String(c._id) === k)?.name) || '—' }));

  // Ticket medio/mediano de gastos
  const gastosList = (monthTxs as any[]).filter(t => t.type === 'expense').map(t => t.amount || 0).sort((a, b) => a - b);
  const ticketMedio = gastosList.length ? (gastosList.reduce((s, n) => s + n, 0) / gastosList.length) : 0;
  const ticketMediano = gastosList.length ? (gastosList.length % 2 ? gastosList[(gastosList.length - 1) / 2] : (gastosList[gastosList.length / 2 - 1] + gastosList[gastosList.length / 2]) / 2) : 0;

  // Concentración de ingresos por origen (payee)
  const ingresosPorPayee = new Map<string, number>();
  for (const t of monthTxs as any[]) {
    if (t.type === 'income') {
      const key = String(t.payeeId || t.payeeName || '—');
      ingresosPorPayee.set(key, (ingresosPorPayee.get(key) || 0) + (t.amount || 0));
    }
  }
  let ingresoTopNombre = '—';
  let ingresoTopPct: number | null = null;
  if (ingresosPorPayee.size > 0 && ingresosMes > 0) {
    const arr = Array.from(ingresosPorPayee.entries());
    arr.sort((a, b) => b[1] - a[1]);
    const [topKey, topVal] = arr[0];
    ingresoTopNombre = ((payeesList || []).find((p: any) => String(p._id) === topKey)?.name) || (typeof topKey === 'string' ? topKey : '—');
    ingresoTopPct = topVal / ingresosMes;
  }

  function buildNetSparklinePointsRange(txs: any[], start: Date, end: Date, width = 220, height = 48) {
    const msPerDay = 24 * 3600 * 1000;
    const startDayMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endDayMs = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const days = Math.max(1, Math.round((endDayMs - startDayMs) / msPerDay) + 1);
    const dailyNet: number[] = Array.from({ length: days }, () => 0);
    for (const t of txs as any[]) {
      const d = new Date(t.date);
      const dMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const dayIndex = Math.floor((dMs - startDayMs) / msPerDay);
      if (dayIndex >= 0 && dayIndex < days) {
        const delta = t.type === 'income' ? (t.amount || 0) : t.type === 'expense' ? -(t.amount || 0) : 0;
        dailyNet[dayIndex] += delta;
      }
    }
    const cumulative: number[] = [];
    let acc = 0;
    for (let i = 0; i < days; i++) {
      acc += dailyNet[i];
      cumulative.push(acc);
    }
    const minVal = Math.min(...cumulative, 0);
    const maxVal = Math.max(...cumulative, 0);
    const range = maxVal - minVal || 1;
    const xStep = width / Math.max(days - 1, 1);
    const points: string[] = cumulative.map((v, i) => {
      const x = Math.round(i * xStep);
      const y = Math.round(height - ((v - minVal) / range) * height);
      return `${x},${y}`;
    });
    return points.join(' ');
  }

  function buildTypeSparklinePointsRange(txs: any[], start: Date, end: Date, targetType: 'income' | 'expense', width = 220, height = 48) {
    const msPerDay = 24 * 3600 * 1000;
    const startDayMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endDayMs = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const days = Math.max(1, Math.round((endDayMs - startDayMs) / msPerDay) + 1);
    const daily: number[] = Array.from({ length: days }, () => 0);
    for (const t of txs as any[]) {
      if (t.type !== targetType) continue;
      const d = new Date(t.date);
      const dMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const dayIndex = Math.floor((dMs - startDayMs) / msPerDay);
      if (dayIndex >= 0 && dayIndex < days) {
        daily[dayIndex] += (t.amount || 0) * (targetType === 'income' ? 1 : 1);
      }
    }
    const minVal = Math.min(...daily, 0);
    const maxVal = Math.max(...daily, 0);
    const range = maxVal - minVal || 1;
    const xStep = width / Math.max(days - 1, 1);
    const points: string[] = daily.map((v, i) => {
      const x = Math.round(i * xStep);
      const y = Math.round(height - ((v - minVal) / range) * height);
      return `${x},${y}`;
    });
    return points.join(' ');
  }

  function deltaPct(curr: number, prev: number) {
    if (!isFinite(prev) || prev === 0) return null;
    return (curr - prev) / prev;
  }

  const invPLTotal = invValueTotal - invContribTotal;

  return (
    <div className="p-4">
      <main className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Inicio</h1>
            <p className="text-sm text-gray-500">{rangeLabel}</p>
          </div>
          <details className="ml-2">
            <summary className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-800 hover:bg-gray-50">
              <span aria-hidden>⚙️</span>
              Filtros
            </summary>
            <form method="get" className="mt-2 grid grid-cols-1 gap-2 bg-white border border-gray-200 rounded-md p-3 w-[min(92vw,24rem)]">
              <div>
                <label htmlFor="month" className="block text-sm text-gray-700 mb-1">Mes</label>
                <input id="month" name="month" type="month" defaultValue={monthInputValue} className="w-full rounded border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Rápidos</label>
                <select name="preset" defaultValue={spResolved?.preset || ''} className="w-full rounded border border-gray-300 p-2 text-sm">
                  <option value="">—</option>
                  <option value="last-7">Últimos 7 días</option>
                  <option value="last-30">Últimos 30 días</option>
                  <option value="last-90">Últimos 90 días</option>
                  <option value="last-365">Últimos 365 días</option>
                  <option value="year-current">Año actual</option>
                  <option value="year-previous">Año pasado</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Desde</label>
                  <input type="date" name="from" defaultValue={fromStr} className="w-full rounded border border-gray-300 p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Hasta</label>
                  <input type="date" name="to" defaultValue={toStr} className="w-full rounded border border-gray-300 p-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Tipo</label>
                <select name="type" defaultValue={typeFilter} className="w-full rounded border border-gray-300 p-2 text-sm">
                  <option value="">Todos</option>
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                </select>
              </div>
              {auth?.userId ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Cuenta</label>
                    <select name="accountId" defaultValue={accountIdFilter} className="w-full rounded border border-gray-300 p-2 text-sm">
                      <option value="">Cuentas (todas)</option>
                      {((accountsList || []) as any[]).map((a: any) => (
                        <option key={String(a._id)} value={String(a._id)}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Categoría</label>
                    <select name="categoryId" defaultValue={categoryIdFilter} className="w-full rounded border border-gray-300 p-2 text-sm">
                      <option value="">Categorías (todas)</option>
                      {((categoriesList || []) as any[]).map((c: any) => (
                        <option key={String(c._id)} value={String(c._id)}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Origen / Servicio</label>
                    <select name="payeeId" defaultValue={payeeIdFilter} className="w-full rounded border border-gray-300 p-2 text-sm">
                      <option value="">Origen (todos)</option>
                      {((payeesList || []) as any[]).map((p: any) => (
                        <option key={String(p._id)} value={String(p._id)}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
              <button type="submit" className="w-full rounded bg-blue-600 text-white px-3 py-2 text-sm">Aplicar</button>
              <a href="/" className="mt-2 inline-flex items-center justify-center w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Limpiar filtros</a>
            </form>
          </details>
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
                <p className="text-sm text-gray-500">Ingresos</p>
                <p className="text-3xl font-bold text-emerald-600">{formatEUR(ingresosMes)}</p>
                {auth?.userId ? (
                  <div className="mt-3">
                    <svg width="220" height="48" viewBox={`0 0 220 48`} className="w-full" aria-label="Tendencia ingresos">
                      <polyline
                        points={buildTypeSparklinePointsRange(monthTxs, rangeStart, rangeEnd, 'income')}
                        fill="none"
                        stroke="currentColor"
                        className="text-emerald-500"
                        strokeWidth="2"
                      />
                    </svg>
                    <p className="mt-1 text-xs text-gray-500">Tendencia del rango</p>
                  </div>
                ) : null}
                {(() => {
                  const p = deltaPct(ingresosMes, ingresosPrev);
                  if (p === null) return null;
                  const up = p >= 0;
                  return (
                    <p className="mt-1 text-xs text-gray-500" title={prevStartStr && prevEndStr ? `Periodo anterior: ${prevStartStr} al ${prevEndStr} · Ingresos previos: ${formatEUR(ingresosPrev)}` : undefined}>
                      <span className={up ? 'text-emerald-600' : 'text-rose-600'}>{up ? '▲' : '▼'} {Math.abs(p * 100).toFixed(0)}%</span> vs periodo anterior
                    </p>
                  );
                })()}
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Egresos</p>
                <p className="text-3xl font-bold text-rose-600">{formatEUR(egresosMes)}</p>
                {auth?.userId ? (
                  <div className="mt-3">
                    <svg width="220" height="48" viewBox={`0 0 220 48`} className="w-full" aria-label="Tendencia egresos">
                      <polyline
                        points={buildTypeSparklinePointsRange(monthTxs, rangeStart, rangeEnd, 'expense')}
                        fill="none"
                        stroke="currentColor"
                        className="text-rose-500"
                        strokeWidth="2"
                      />
                    </svg>
                    <p className="mt-1 text-xs text-gray-500">Tendencia del rango</p>
                  </div>
                ) : null}
                {(() => {
                  const p = deltaPct(egresosMes, egresosPrev);
                  if (p === null) return null;
                  const up = p >= 0;
                  return (
                    <p className="mt-1 text-xs text-gray-500" title={prevStartStr && prevEndStr ? `Periodo anterior: ${prevStartStr} al ${prevEndStr} · Egresos previos: ${formatEUR(egresosPrev)}` : undefined}>
                      <span className={up ? 'text-rose-600' : 'text-emerald-600'}>{up ? '▲' : '▼'} {Math.abs(p * 100).toFixed(0)}%</span> vs periodo anterior
                    </p>
                  );
                })()}
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Ahorro neto</p>
                <p className={`text-3xl font-bold ${ahorroNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatEUR(ahorroNeto)}
                </p>
                {(() => {
                  const p = deltaPct(ahorroNeto, ahorroNetoPrev);
                  if (p === null) return null;
                  const up = p >= 0;
                  return (
                    <p className="mt-1 text-xs text-gray-500" title={prevStartStr && prevEndStr ? `Periodo anterior: ${prevStartStr} al ${prevEndStr} · Ahorro previo: ${formatEUR(ahorroNetoPrev)}` : undefined}>
                      <span className={up ? 'text-emerald-600' : 'text-rose-600'}>{up ? '▲' : '▼'} {Math.abs(p * 100).toFixed(0)}%</span> vs periodo anterior
                    </p>
                  );
                })()}
                {auth?.userId ? (
                  <div className="mt-3">
                    <svg width="220" height="48" viewBox={`0 0 220 48`} className="w-full" aria-label="Tendencia ahorro neto">
                      <polyline
                        points={buildNetSparklinePointsRange(monthTxs, rangeStart, rangeEnd)}
                        fill="none"
                        stroke="currentColor"
                        className="text-indigo-500"
                        strokeWidth="2"
                      />
                    </svg>
                    <p className="mt-1 text-xs text-gray-500">Tendencia del rango</p>
                  </div>
                ) : null}
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Próximos pagos</p>
                <p className="text-3xl font-bold text-indigo-600">{proximosPagos}</p>
                <p className="mt-1 text-xs text-gray-500">Comprometido: {formatEUR(recurrAmountTotal)}{typeof daysUntilNextRecurrent === 'number' ? ` · Próximo en ${daysUntilNextRecurrent}d` : ''}</p>
              </div>
              {invCount > 0 ? (
                <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-500">Inversiones</p>
                  <p className="text-3xl font-bold text-gray-900">{formatEUR(invValueTotal)}</p>
                  <p className="mt-1 text-xs text-gray-500">P/L total: <span className={invPLTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatEUR(invPLTotal)}</span> · {invCount} posiciones</p>
                </div>
              ) : null}
            </div>

            {/* Tarjetas minimalistas adicionales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Tasa de ahorro</p>
                <p className="text-2xl font-semibold">{tasaAhorro !== null ? `${(tasaAhorro * 100).toFixed(0)}%` : '—'}</p>
                <p className="mt-1 text-xs text-gray-500">{rangeLabel}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Ratio ingresos/gastos</p>
                <p className="text-2xl font-semibold">{ratioIngresosGastos !== null ? ratioIngresosGastos.toFixed(2) : '—'}</p>
                <p className="mt-1 text-xs text-gray-500">{rangeLabel}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Burn rate diario</p>
                <p className="text-2xl font-semibold">{formatEUR(burnRateDiario)}</p>
                <p className="mt-1 text-xs text-gray-500">{daysInRange} días</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Top categorías (gasto)</p>
                {topCats.length ? (
                  <div className="mt-2">
                    {topCats.map(tc => (
                      <div key={tc.id} className="mb-2">
                        <div className="flex justify-between text-sm text-gray-700"><span>{tc.name}</span><span>{formatEUR(tc.amount)}</span></div>
                        <div className="mt-1 h-2 bg-gray-100 rounded">
                          <div className="h-2 bg-rose-500 rounded" style={{ width: `${Math.round((tc.amount / Math.max(1, ...topCats.map(c => c.amount))) * 100)}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">—</p>
                )}
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Ticket medio/mediano (gasto)</p>
                <p className="text-sm text-gray-800">{formatEUR(ticketMedio)} · {formatEUR(ticketMediano)}</p>
                <p className="mt-1 text-xs text-gray-500">{gastosList.length} movimientos</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Concentración ingresos</p>
                <p className="text-sm text-gray-800">{ingresoTopNombre}</p>
                <p className="text-2xl font-semibold">{ingresoTopPct !== null ? `${(ingresoTopPct * 100).toFixed(0)}%` : '—'}</p>
              </div>
            </div>

            {/* Enlaces rápidos duplicados retirados para evitar redundancias con el menú */}
          </section>
        )}
      </main>
    </div>
  );
}
