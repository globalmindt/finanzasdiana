import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { getCollection } from '@/lib/db';
import CategoryCreateForm from './CategoryCreateForm';
import CategoryRow from './CategoryRow';

export default async function CategoriasPage({ searchParams }: { searchParams?: { kind?: string; q?: string } }) {
  const auth = await getAuthUser();
  if (!auth?.userId) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Categorías</h1>
        <div className="mt-4 rounded bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-gray-700">No has iniciado sesión.</p>
          <p className="text-sm text-gray-700">Por favor, entra para gestionar tus categorías.</p>
          <div className="mt-3">
            <Link href="/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">Entrar</Link>
          </div>
        </div>
      </div>
    );
  }

  const categories = await getCollection('categories');
  const query: any = { userId: auth.userId };
  if (searchParams?.kind) query.kind = searchParams.kind;
  const listAll = await categories.find(query).sort({ name: 1 }).toArray();
  const q = (searchParams?.q || '').toLowerCase();
  const list = q ? listAll.filter((c: any) => String(c.name).toLowerCase().includes(q)) : listAll;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Categorías</h1>
      <div className="mt-2">
        <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo</label>
            <select name="kind" defaultValue={searchParams?.kind || ''} className="w-full rounded border p-2">
              <option value="">Todos</option>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Buscar</label>
            <input type="text" name="q" defaultValue={searchParams?.q || ''} placeholder="Nombre de categoría" className="w-full rounded border p-2" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="rounded bg-blue-600 text-white px-4 py-2">Filtrar</button>
          </div>
        </form>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2">Agregar categoría</h2>
          <CategoryCreateForm />
        </div>
        <div className="rounded bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2">Listado</h2>
          {list.length === 0 ? (
            <p className="text-gray-600">Aún no tienes categorías.</p>
          ) : (
            <ul className="divide-y">
              {list.map((cat: any) => (
                <CategoryRow key={String(cat._id)} cat={{ _id: String(cat._id), name: cat.name, kind: cat.kind, fixedOrVariable: cat.fixedOrVariable, color: cat.color }} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}