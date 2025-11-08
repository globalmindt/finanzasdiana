import Link from 'next/link';
import AccountCreateForm from './AccountCreateForm';
import AccountDeleteButton from './AccountDeleteButton';
import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function formatEUR(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default async function CuentasPage() {
  const auth = await getAuthUser();
  if (!auth?.userId) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Cuentas</h1>
        <div className="mt-4 rounded bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-gray-700">No has iniciado sesión.</p>
          <p className="text-sm text-gray-700">Por favor, entra para gestionar tus cuentas.</p>
          <div className="mt-3">
            <Link href="/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">Entrar</Link>
          </div>
        </div>
      </div>
    );
  }

  const accounts = await getCollection('accounts');
  const list = await accounts.find({ userId: auth.userId }).sort({ createdAt: -1 }).toArray();

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Cuentas</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2">Agregar cuenta</h2>
          <AccountCreateForm />
        </div>
        <div className="rounded bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2">Listado</h2>
          {list.length === 0 ? (
            <p className="text-gray-600">Aún no tienes cuentas.</p>
          ) : (
            <ul className="divide-y">
              {list.map((acc: any) => (
                <li key={acc._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{acc.name} <span className="text-xs text-gray-500">({acc.type})</span></p>
                    <p className="text-xs text-gray-500">Saldo inicial: {formatEUR(Number(acc.initialBalance || 0))}</p>
                  </div>
                  <AccountDeleteButton id={String(acc._id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}