import Link from 'next/link';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import TransactionEditForm from '../TransactionEditForm';

export default async function EditMovimientoPage({ params }: { params: { id: string } }) {
  const auth = await getAuthUser();
  if (!auth?.userId) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Editar movimiento</h1>
        <div className="mt-4 rounded bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-gray-700">No has iniciado sesión.</p>
          <p className="text-sm text-gray-700">Por favor, entra para editar movimientos.</p>
          <div className="mt-3">
            <Link href="/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">Entrar</Link>
          </div>
        </div>
      </div>
    );
  }

  const transactions = await getCollection('transactions');
  const tx = await transactions.findOne({ _id: new ObjectId(params.id), userId: auth.userId });
  if (!tx) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Editar movimiento</h1>
        <p className="mt-2 text-red-600">Movimiento no encontrado.</p>
        <div className="mt-3">
          <Link href="/movs" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">Volver a Movimientos</Link>
        </div>
      </div>
    );
  }

  const accountsCol = await getCollection('accounts');
  const categoriesCol = await getCollection('categories');
  const accounts = await accountsCol.find({ userId: auth.userId, isActive: true }).sort({ name: 1 }).toArray();
  const categories = await categoriesCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Editar movimiento</h1>
      <div className="mt-4 rounded bg-white p-4 shadow-sm">
        {/* Pass transaction and supporting lists to client form */}
        <TransactionEditForm transaction={{ ...(tx as any), _id: String((tx as any)._id) }} accounts={accounts as any[]} categories={categories as any[]} />
      </div>
      <div className="mt-3">
        <Link href="/movs" className="text-sm text-blue-600">Volver al listado</Link>
      </div>
    </div>
  );
}