import Link from 'next/link';
import { getCollection } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import CsvImportClient from './CsvImportClient';

export default async function ImportPage() {
  const auth = await getAuthUser();
  if (!auth?.userId) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Importar CSV</h1>
        <div className="mt-4 rounded bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-gray-700">No has iniciado sesión.</p>
          <p className="text-sm text-gray-700">Por favor, entra para importar movimientos.</p>
          <div className="mt-3">
            <Link href="/login" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">Entrar</Link>
          </div>
        </div>
      </div>
    );
  }

  const accountsCol = await getCollection('accounts');
  const accounts = await accountsCol.find({ userId: auth.userId, isActive: true }).sort({ name: 1 }).toArray();

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Importar desde CSV</h1>
      <p className="text-sm text-gray-600 mt-1">Sube el archivo de tu banco para clasificar e insertar movimientos automáticamente.</p>
      <div className="mt-4 rounded bg-white p-4 shadow-sm">
        <CsvImportClient accounts={(accounts as any[]).map(a => ({ ...a, _id: String((a as any)._id) }))} />
      </div>
      <div className="mt-3">
        <Link href="/movs" className="text-sm text-blue-600">Ver movimientos</Link>
      </div>
    </div>
  );
}