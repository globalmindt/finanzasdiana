import Link from 'next/link';
import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Suspense } from 'react';
import { ObjectId } from 'mongodb';

function formatEUR(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default async function MovimientosPage({ searchParams }: { searchParams?: { from?: string; to?: string; type?: string; page?: string; accountId?: string; categoryId?: string; payeeId?: string } | Promise<{ from?: string; to?: string; type?: string; page?: string; accountId?: string; categoryId?: string; payeeId?: string }> }) {
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
  const sp: any = await (searchParams as any);
  const query: any = { userId: auth.userId };
  const type = sp?.type || '';
  const from = sp?.from || '';
  const to = sp?.to || '';
  const limit = 50;
  const page = Math.max(1, Number(sp?.page || 1));
  const skip = (page - 1) * limit;

  if (type) query.type = type;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) query.date.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const accountIdFilter = sp?.accountId || '';
  const categoryIdFilter = sp?.categoryId || '';
  const payeeIdFilter = sp?.payeeId || '';
  if (accountIdFilter) {
    // Coincidir movimientos con esa cuenta (income/expense) o transferencias desde/hacia la cuenta
    query.$or = [
      { accountId: accountIdFilter },
      { fromAccountId: accountIdFilter },
      { toAccountId: accountIdFilter },
    ];
  }
  if (categoryIdFilter) query.categoryId = categoryIdFilter;
  if (payeeIdFilter) query.payeeId = payeeIdFilter;
  const total = await transactions.countDocuments(query);
  const cursor = transactions.find(query).sort({ date: -1 }).skip(skip).limit(limit);
  const txs = await cursor.toArray();

  const startIdx = total === 0 ? 0 : skip + 1;
  const endIdx = Math.min(skip + txs.length, total);
  const hasPrev = page > 1;
  const hasNext = skip + txs.length < total;
  const urlWithParams = (p: number) => {
    const sp = new URLSearchParams();
    if (type) sp.set('type', type);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    if (accountIdFilter) sp.set('accountId', accountIdFilter);
    if (categoryIdFilter) sp.set('categoryId', categoryIdFilter);
    if (payeeIdFilter) sp.set('payeeId', payeeIdFilter);
    sp.set('page', String(p));
    return `/movs?${sp.toString()}`;
  };

  // Obtener listas completas para filtros y para mostrar nombres
  const accountsCol = await getCollection('accounts');
  const categoriesCol = await getCollection('categories');
  const payeesCol = await getCollection('payees');
  const accountsDocs = await accountsCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();
  const categoriesDocs = await categoriesCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();
  const payeesDocs = await payeesCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();
  const accountsMap = new Map<string, any>(accountsDocs.map((d: any) => [String(d._id), d]));
  const categoriesMap = new Map<string, any>(categoriesDocs.map((d: any) => [String(d._id), d]));
  const payeesMap = new Map<string, any>(payeesDocs.map((d: any) => [String(d._id), d]));

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Movimientos</h1>
      <div className="mt-2 text-right">
        <Link href="/add" className="inline-block rounded bg-green-600 px-4 py-2 text-white">Agregar</Link>
      </div>
      <form method="get" className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3 bg-white border border-gray-200 rounded-md p-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipo</label>
          <select name="type" defaultValue={sp?.type || ''} className="w-full rounded border p-2">
            <option value="">Todos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Cuenta</label>
          <select name="accountId" defaultValue={sp?.accountId || ''} className="w-full rounded border p-2">
            <option value="">Todas</option>
            {accountsDocs.map((a: any) => (
              <option key={String(a._id)} value={String(a._id)}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Categoría</label>
          <select name="categoryId" defaultValue={sp?.categoryId || ''} className="w-full rounded border p-2">
            <option value="">Todas</option>
            {categoriesDocs.map((c: any) => (
              <option key={String(c._id)} value={String(c._id)}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Origen / Servicio</label>
          <select name="payeeId" defaultValue={sp?.payeeId || ''} className="w-full rounded border p-2">
            <option value="">Todos</option>
            {payeesDocs.map((p: any) => (
              <option key={String(p._id)} value={String(p._id)}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Desde</label>
          <input type="date" name="from" defaultValue={sp?.from || ''} className="w-full rounded border p-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Hasta</label>
          <input type="date" name="to" defaultValue={sp?.to || ''} className="w-full rounded border p-2" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full md:w-auto rounded bg-blue-600 text-white px-4 py-3 text-base">Filtrar</button>
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
            <li key={t._id} className="p-3 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t.description || t.payeeName || (t.payeeId ? (payeesMap.get(t.payeeId)?.name || '') : '') || (t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia')}
                </p>
                <p className="text-xs text-gray-500">{new Date(t.date).toLocaleString('es-ES')}</p>
                <div className="text-xs text-gray-600 space-x-2">
                  {t.type !== 'transfer' ? (
                    <>
                      {t.accountId ? <span>Cuenta: {accountsMap.get(t.accountId)?.name || '—'}</span> : null}
                      {t.categoryId ? <span>• Categoría: {categoriesMap.get(t.categoryId)?.name || '—'}</span> : <span>• Sin categoría</span>}
                      {(t.payeeId || t.payeeName) ? <span>• Origen: {t.payeeName || payeesMap.get(t.payeeId)?.name || '—'}</span> : null}
                    </>
                  ) : (
                    <>
                      <span>Transferencia</span>
                      {t.fromAccountId ? <span>• Desde: {accountsMap.get(t.fromAccountId)?.name || '—'}</span> : null}
                      {t.toAccountId ? <span>• Hacia: {accountsMap.get(t.toAccountId)?.name || '—'}</span> : null}
                    </>
                  )}
                </div>
                {t.notes ? (
                  <p className="text-xs text-gray-500">Notas: {String(t.notes).length > 100 ? String(t.notes).slice(0, 100) + '…' : String(t.notes)}</p>
                ) : null}
              </div>
              <div className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : t.type === 'expense' ? 'text-red-600' : 'text-gray-700'}`}>
                {formatEUR(Number(t.amount || 0))}
                <Link href={`/movs/${t._id}`} className="ml-3 text-xs text-blue-600">Editar</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-700">
        <div>
          {total > 0 ? (
            <span>Mostrando {startIdx}–{endIdx} de {total}</span>
          ) : (
            <span>Sin resultados</span>
          )}
        </div>
        <div className="space-x-2">
          {hasPrev && (
            <Link href={urlWithParams(page - 1)} className="inline-block rounded border px-3 py-1">Anterior</Link>
          )}
          {hasNext && (
            <Link href={urlWithParams(page + 1)} className="inline-block rounded border px-3 py-1">Siguiente</Link>
          )}
        </div>
      </div>
    </div>
  );
}