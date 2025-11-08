import Link from 'next/link';
import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import PayeeCreateForm from './PayeeCreateForm';
import PayeeDeleteButton from './PayeeDeleteButton';
import PayeesListClient from './PayeesListClient';

export default async function ServiciosPage() {
  const auth = await getAuthUser();
  if (!auth?.userId) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Servicios</h1>
        <div className="mt-4 rounded bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-gray-700">No has iniciado sesión.</p>
          <p className="text-sm text-gray-700">Por favor, entra para gestionar tus servicios.</p>
          <div className="mt-3">
            <Link href="/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">Entrar</Link>
          </div>
        </div>
      </div>
    );
  }

  const payeesCol = await getCollection('payees');
  const categoriesCol = await getCollection('categories');
  const list = await payeesCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();
  const categories = await categoriesCol.find({ userId: auth.userId }).sort({ name: 1 }).toArray();

  // Normalize for client component props
  const serialize = (doc: any) => {
    const o: any = { ...doc };
    if (o._id) o._id = String(o._id);
    if (o.userId) o.userId = String(o.userId);
    if (o.createdAt instanceof Date) o.createdAt = o.createdAt.toISOString();
    return o;
  };
  const categoriesSafe = categories.map(serialize);
  const listSafe = list.map(serialize);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Servicios</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2">Agregar servicio</h2>
          <PayeeCreateForm categories={categoriesSafe as any[]} />
        </div>
        <div className="rounded bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2">Listado</h2>
          {listSafe.length === 0 ? (
            <p className="text-gray-600">Aún no tienes servicios.</p>
          ) : (
            <PayeesListClient list={listSafe as any} categories={categoriesSafe as any} />
          )}
        </div>
      </div>
    </div>
  );
}