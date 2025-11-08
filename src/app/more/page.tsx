export default function MasPage() {
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">Más</h1>
      <p className="text-gray-600 mt-2">Ajustes y opciones.</p>
      <ul className="mt-4 list-disc pl-5 text-sm">
        <li>
          <a href="/categories" className="text-blue-600">Gestionar categorías</a>
        </li>
      </ul>
    </main>
  );
}