export default function MasPage() {
  return (
    <main className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Más</h1>
        <a href="/" className="text-sm text-blue-600">Volver al inicio</a>
      </div>
      <p className="text-gray-600 mt-2">Accesos rápidos y herramientas.</p>

      <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="/add" className="rounded border p-3 hover:bg-gray-50">
          <div className="text-2xl" aria-hidden>➕</div>
          <p className="font-semibold mt-1">Agregar movimiento</p>
          <p className="text-sm text-gray-600">Registra un ingreso, gasto o transferencia.</p>
        </a>
        <a href="/movs" className="rounded border p-3 hover:bg-gray-50">
          <div className="text-2xl" aria-hidden>📄</div>
          <p className="font-semibold mt-1">Movimientos</p>
          <p className="text-sm text-gray-600">Consulta y filtra tus movimientos.</p>
        </a>
        <a href="/accounts" className="rounded border p-3 hover:bg-gray-50">
          <div className="text-2xl" aria-hidden>🏦</div>
          <p className="font-semibold mt-1">Cuentas</p>
          <p className="text-sm text-gray-600">Gestiona tus cuentas y saldos.</p>
        </a>
        <a href="/payees" className="rounded border p-3 hover:bg-gray-50">
          <div className="text-2xl" aria-hidden>🧩</div>
          <p className="font-semibold mt-1">Servicios</p>
          <p className="text-sm text-gray-600">Define servicios y pagos recurrentes.</p>
        </a>
        <a href="/categories" className="rounded border p-3 hover:bg-gray-50">
          <div className="text-2xl" aria-hidden>🏷️</div>
          <p className="font-semibold mt-1">Categorías</p>
          <p className="text-sm text-gray-600">Organiza tus categorías de ingresos y gastos.</p>
        </a>
        <a href="/investments" className="rounded border p-3 hover:bg-gray-50">
          <div className="text-2xl" aria-hidden>📈</div>
          <p className="font-semibold mt-1">Portafolio</p>
          <p className="text-sm text-gray-600">Consulta tus inversiones (ETFs/acciones).</p>
        </a>
        <a href="/import" className="rounded border p-3 hover:bg-gray-50">
          <div className="text-2xl" aria-hidden>🗂️</div>
          <p className="font-semibold mt-1">Importar CSV</p>
          <p className="text-sm text-gray-600">Importa movimientos desde tu banco o broker.</p>
        </a>
        <a href="/more/system" className="rounded border p-3 hover:bg-gray-50">
          <div className="text-2xl" aria-hidden>🩺</div>
          <p className="font-semibold mt-1">Salud del sistema</p>
          <p className="text-sm text-gray-600">Verifica estado, índices y tareas.</p>
        </a>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Consejos</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
          <li>Usa “Importar CSV” para acelerar el alta de movimientos.</li>
          <li>Configura “Servicios” para controlar pagos fijos y próximos.</li>
          <li>Consulta “Portafolio” para seguimiento básico de inversiones.</li>
        </ul>
      </section>
    </main>
  );
}