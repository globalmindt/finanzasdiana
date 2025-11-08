import Link from 'next/link';
import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import AddTransactionForm from './AddTransactionForm';

export default async function AgregarPage() {
  const auth = await getAuthUser();
  if (!auth?.userId) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Agregar</h1>
        <div className="mt-4 rounded bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-gray-700">No has iniciado sesión.</p>
          <p className="text-sm text-gray-700">Por favor, entra para agregar movimientos.</p>
          <div className="mt-3">
            <Link href="/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">Entrar</Link>
          </div>
        </div>
      </div>
    );
  }

  const accountsCol = await getCollection('accounts');
  const categoriesCol = await getCollection('categories');
  const payeesCol = await getCollection('payees');
  const accounts = await accountsCol.find({ userId: auth.userId, isActive: true }).sort({ name: 1 }).toArray();
  const categories = await categoriesCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();
  const payees = await payeesCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Agregar movimiento</h1>
      <div className="mt-4 rounded bg-white p-4 shadow-sm">
        <AddTransactionForm accounts={accounts as any[]} categories={categories as any[]} payees={payees as any[]} />
      </div>
    </div>
  );
}